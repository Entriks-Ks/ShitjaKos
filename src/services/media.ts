import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getPrisma } from "@/lib/prisma";
import { Actor, canManageListing } from "@/lib/permissions";

export class MediaOperationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function uploadPath(key: string) {
  return join(process.cwd(), ".uploads", key);
}

export async function addListingPhoto(
  actor: Actor,
  listingId: string,
  file: FormDataEntryValue | null,
) {
  const db = getPrisma();
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { personalProfile: true, business: { include: { memberships: true } } },
  });
  if (
    !listing ||
    !canManageListing(actor, listing) ||
    ["SOLD", "CLOSED"].includes(listing.status)
  ) {
    throw new MediaOperationError("Not allowed.", 403);
  }
  if (!(file instanceof File) || !file.size || file.size > 8 * 1024 * 1024) {
    throw new MediaOperationError("Choose a JPEG, PNG or WebP image under 8 MB.", 400);
  }

  let key: string | undefined;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer, { limitInputPixels: 25_000_000 }).metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
      throw new MediaOperationError("Only JPEG, PNG and WebP images are allowed.", 400);
    }
    const image = await sharp(buffer, { limitInputPixels: 25_000_000 })
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    key = `${randomUUID()}.webp`;
    await mkdir(join(process.cwd(), ".uploads"), { recursive: true });
    await writeFile(uploadPath(key), image);

    const media = await db.$transaction(async (tx) => {
      const locked = await tx.listing.updateMany({
        where: { id: listingId, version: listing.version },
        data: { version: { increment: 1 }, moderationStatus: "PENDING" },
      });
      if (!locked.count)
        throw new MediaOperationError("Listing changed. Retry the photo upload.", 409);
      const count = await tx.listingMedia.count({ where: { listingId } });
      if (count >= 12)
        throw new MediaOperationError("A listing can have at most 12 images.", 400);
      const item = await tx.listingMedia.create({
        data: { listingId, storageKey: key!, altText: listing.title, position: count },
      });
      await tx.auditEvent.create({
        data: {
          actorId: actor.id,
          action: "listing.photo-added",
          targetId: listingId,
          detail: { mediaId: item.id },
        },
      });
      return item;
    });
    return media.id;
  } catch (error) {
    if (key) await unlink(uploadPath(key)).catch(() => {});
    throw error;
  }
}

export async function deleteListingPhoto(
  actor: Actor,
  listingId: string,
  mediaId: string,
) {
  const db = getPrisma();
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: {
      personalProfile: true,
      business: { include: { memberships: true } },
      media: { orderBy: { position: "asc" } },
    },
  });
  if (
    !listing ||
    !canManageListing(actor, listing) ||
    ["SOLD", "CLOSED"].includes(listing.status)
  ) {
    throw new MediaOperationError("Not allowed.", 403);
  }
  const media = listing.media.find((item) => item.id === mediaId);
  if (!media) throw new MediaOperationError("Photo not found.", 404);

  try {
    await db.$transaction(async (tx) => {
      const changed = await tx.listing.updateMany({
        where: { id: listingId, version: listing.version },
        data: { version: { increment: 1 }, moderationStatus: "PENDING" },
      });
      if (!changed.count)
        throw new MediaOperationError("Listing changed. Reload and retry.", 409);
      await tx.listingMedia.delete({ where: { id: mediaId } });
      for (const [position, item] of listing.media
        .filter((item) => item.id !== mediaId)
        .entries()) {
        await tx.listingMedia.update({ where: { id: item.id }, data: { position } });
      }
      await tx.auditEvent.create({
        data: {
          actorId: actor.id,
          action: "listing.photo-deleted",
          targetId: listingId,
          detail: { mediaId },
        },
      });
    });
  } catch (error) {
    if (error instanceof MediaOperationError) throw error;
    throw new MediaOperationError("Listing changed. Reload and retry.", 409);
  }
  await unlink(uploadPath(media.storageKey)).catch(() => {});
}
