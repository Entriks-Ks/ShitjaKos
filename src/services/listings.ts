import "server-only";
import { getPrisma } from "@/lib/prisma";
import { listingInput, validateAttributes } from "@/lib/validations/listing";
import { Actor, canManageListing, canTransition } from "@/lib/permissions";
import { Prisma } from "@/generated/prisma/client";
import { removeListingThumbnail } from "@/lib/listing-images";
import { basename, join } from "node:path";
import { unlink } from "node:fs/promises";




export async function saveListing(actor: Actor, raw: unknown) {
  const v = listingInput.parse(raw);
  if (actor.suspendedAt) throw new Error("Your account is suspended.");
  return getPrisma().$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: actor.id },
      include: { profile: true },
    });
    if (user.suspendedAt || !user.emailVerified)
      throw new Error("Verify your email before creating a listing.");
    const category = await tx.category.findUnique({
      where: { id: v.categoryId },
      include: { attributes: true, children: true },
    });
    if (
      !category?.active ||
      category.ownerPortal !== "SHITJAKOS" ||
      !category.parentId ||
      category.children.length
    )
      throw new Error("Choose an available subcategory.");
    const attributes = validateAttributes(category.attributes, v.attributes);
    let personalProfileId: string | null = null;
    let businessId: string | null = null;
    if (v.owner === "personal") {
      if (!user.profile) throw new Error("Personal profile missing.");
      personalProfileId = user.profile.id;
    } else {
      const membership = await tx.businessMembership.findUnique({
        where: { userId_businessId: { userId: actor.id, businessId: v.owner } },
        include: { business: true },
      });
      if (!membership || membership.business.suspendedAt)
        throw new Error("You cannot list for this business.");
      businessId = membership.businessId;
    }
    const data = {
      title: v.title,
      description: v.description,
      categoryId: v.categoryId,
      intent: v.intent,
      priceCents: Math.round(Number(v.price) * 100),
      city: v.city,
      condition: v.condition,
      negotiable: v.negotiable,
      phoneVisible: v.phoneVisible,
      contactPhone: v.phoneVisible ? v.contactPhone : null,
    };
    if (v.id) {
      const existing = await tx.listing.findUniqueOrThrow({
        where: { id: v.id },
        include: { personalProfile: true, business: { include: { memberships: true } } },
      });
      if (!canManageListing(actor, existing))
        throw new Error("You cannot edit this listing.");
      if (
        existing.personalProfileId !== personalProfileId ||
        existing.businessId !== businessId
      )
        throw new Error("Listing ownership cannot be changed.");
      if (["SOLD", "CLOSED"].includes(existing.status))
        throw new Error("Closed listings cannot be edited.");
      const changed = await tx.listing.updateMany({
        where: { id: v.id, version: v.version },
        data: { ...data, version: { increment: 1 } },
      });
      if (!changed.count)
        throw new Error("This listing changed in another tab. Reload before editing.");
      await tx.listingAttributeValue.deleteMany({ where: { listingId: v.id } });
      await tx.listingAttributeValue.createMany({
        data: attributes.map((a) => ({ ...a, listingId: v.id! })),
      });
      await audit(tx, actor.id, "listing.edited", v.id, { version: v.version + 1 });
      return v.id;
    }
    const item = await tx.listing.create({
      data: {
        ...data,
        moderationStatus: "APPROVED",
        createdById: actor.id,
        personalProfileId,
        businessId,
        attributes: { create: attributes },
      },
    });
    await audit(tx, actor.id, "listing.created", item.id, { owner: v.owner });
    return item.id;
  });
}
export async function transitionListing(
  actor: Actor,
  id: string,
  target: "PUBLISHED" | "PAUSED" | "SOLD" | "CLOSED",
) {
  return getPrisma().$transaction(async (tx) => {
    const item = await tx.listing.findUniqueOrThrow({
      where: { id },
      include: {
        personalProfile: true,
        business: { include: { memberships: true } },
        media: true,
      },
    });
    if (!canManageListing(actor, item))
      throw new Error("You cannot change this listing.");
    if (!canTransition(item.status, target))
      throw new Error("This status change is not allowed.");
    if (target === "PUBLISHED") {
      if (item.moderationStatus === "REJECTED")
        throw new Error("This listing is blocked from publication.");
      if (!item.media.length)
        throw new Error("Add at least one photo before publishing.");
      if (
        item.business &&
        (item.business.reviewStatus !== "APPROVED" || item.business.suspendedAt)
      )
        throw new Error("Your business must be approved before publishing.");
    }
    const updated = await tx.listing.updateMany({
      where: { id, version: item.version },
      data: {
        status: target,
        version: { increment: 1 },
        ...(target === "PUBLISHED"
          ? {
            moderationStatus: "APPROVED",
            publishedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 86400000),
          }
          : {}),
        ...(target === "SOLD" ? { soldAt: new Date() } : {}),
      },
    });
    if (!updated.count) throw new Error("Listing changed. Please retry.");
    await audit(tx, actor.id, "listing.status", id, { from: item.status, to: target });
  });
}
export async function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  targetId: string,
  detail: Prisma.InputJsonValue,
) {
  await tx.auditEvent.create({ data: { actorId, action, targetId, detail } });
}


export async function deleteListing(actor: Actor, id: string) {
  const media = await getPrisma().$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: actor.id },
    });

    const listing = await tx.listing.findUniqueOrThrow({
      where: { id },
      include: {
        personalProfile: true,
        business: { include: { memberships: true } },
        media: true,
      },
    });

    if (!canManageListing(user, listing)) {
      throw new Error("You cannot delete this listing.");
    }

    const deleted = await tx.listing.deleteMany({
      where: {
        id,
        version: listing.version,
      },
    });

    if (deleted.count !== 1) {
      throw new Error("The listing changed. Reload and try again.");
    }

    await audit(tx, actor.id, "listing.deleted", id, {
      title: listing.title,
    });

    return listing.media;
  });

  // Remove files only after the database transaction succeeds.
  for (const image of media) {
    const key = image.storageKey;

    if (basename(key) !== key || key.includes("\\")) {
      console.error("Skipped an invalid image storage key.");
      continue;
    }

    try {
      await unlink(join(process.cwd(), ".uploads", key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Could not remove a deleted listing image.", error);
      }
    }

    await removeListingThumbnail(key);
  }
}