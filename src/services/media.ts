import "server-only";
import sharp from "sharp";
import { Actor, canManageListing } from "@/lib/permissions";
import { removeListingImage, storeListingImage } from "@/lib/listing-images";
import { recordAudit } from "@/repositories/audit";
import { withTransaction } from "@/repositories/transaction";
import {
  findListingOwnershipWithOrderedMedia,
  getListingOwnershipDetails,
  updateListingIfVersion,
} from "@/repositories/listings";
import {
  countListingMedia,
  createListingMedia,
  deleteListingMedia,
  setListingMediaPosition,
} from "@/repositories/media";

export class MediaOperationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function addListingPhoto(
  actor: Actor,
  listingId: string,
  file: FormDataEntryValue | null,
) {
  const listing = await getListingOwnershipDetails(listingId);
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
    const storageKey = await storeListingImage(image);
    key = storageKey;

    const media = await withTransaction(async (tx) => {
      if (!(await updateListingIfVersion(tx, listingId, listing.version)))
        throw new MediaOperationError("Listing changed. Retry the photo upload.", 409);
      const count = await countListingMedia(tx, listingId);
      if (count >= 12)
        throw new MediaOperationError("A listing can have at most 12 images.", 400);
      const item = await createListingMedia(tx, {
        listingId,
        storageKey,
        altText: listing.title,
        position: count,
      });
      await recordAudit(tx, actor.id, "listing.photo-added", listingId, {
        mediaId: item.id,
      });
      return item;
    });
    return media.id;
  } catch (error) {
    if (key) await removeListingImage(key);
    throw error;
  }
}

export async function deleteListingPhoto(
  actor: Actor,
  listingId: string,
  mediaId: string,
) {
  const listing = await findListingOwnershipWithOrderedMedia(listingId);
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
    await withTransaction(async (tx) => {
      if (!(await updateListingIfVersion(tx, listingId, listing.version)))
        throw new MediaOperationError("Listing changed. Reload and retry.", 409);
      await deleteListingMedia(tx, mediaId);
      for (const [position, item] of listing.media
        .filter((item) => item.id !== mediaId)
        .entries()) {
        await setListingMediaPosition(tx, item.id, position);
      }
      await recordAudit(tx, actor.id, "listing.photo-deleted", listingId, { mediaId });
    });
  } catch (error) {
    if (error instanceof MediaOperationError) throw error;
    throw new MediaOperationError("Listing changed. Reload and retry.", 409);
  }
  await removeListingImage(media.storageKey);
}
