import "server-only";
import { listingInput, validateAttributes } from "@/lib/validations/listing";
import { Actor, canManageListing, canTransition } from "@/lib/permissions";
import { removeListingImages } from "@/lib/listing-images";
import { recordAudit } from "@/repositories/audit";
import { withTransaction } from "@/repositories/transaction";
import { findCategoryForListing } from "@/repositories/catalog";
import { findBusinessMembership } from "@/repositories/businesses";
import { findUser, findUserWithProfile } from "@/repositories/users";
import {
  createListing,
  deleteListingIfVersion,
  findListingOwnership,
  findListingOwnershipWithMedia,
  replaceListingAttributes,
  updateListingIfVersion,
  type ListingWriteData,
} from "@/repositories/listings";

export async function saveListing(actor: Actor, raw: unknown) {
  const v = listingInput.parse(raw);
  if (actor.suspendedAt) throw new Error("Your account is suspended.");
  return withTransaction(async (tx) => {
    const user = await findUserWithProfile(tx, actor.id);
    if (user.suspendedAt || !user.emailVerified)
      throw new Error("Verify your email before creating a listing.");
    const category = await findCategoryForListing(tx, v.categoryId);
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
      const membership = await findBusinessMembership(tx, actor.id, v.owner);
      if (!membership || membership.business.suspendedAt)
        throw new Error("You cannot list for this business.");
      businessId = membership.businessId;
    }
    const data: ListingWriteData = {
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
      const existing = await findListingOwnership(tx, v.id);
      if (!canManageListing(actor, existing))
        throw new Error("You cannot edit this listing.");
      if (
        existing.personalProfileId !== personalProfileId ||
        existing.businessId !== businessId
      )
        throw new Error("Listing ownership cannot be changed.");
      if (["SOLD", "CLOSED"].includes(existing.status))
        throw new Error("Closed listings cannot be edited.");
      if (!(await updateListingIfVersion(tx, v.id, v.version, data)))
        throw new Error("This listing changed in another tab. Reload before editing.");
      await replaceListingAttributes(tx, v.id, attributes);
      await recordAudit(tx, actor.id, "listing.edited", v.id, {
        version: v.version + 1,
      });
      return v.id;
    }
    const item = await createListing(tx, {
      data,
      attributes,
      createdById: actor.id,
      personalProfileId,
      businessId,
    });
    await recordAudit(tx, actor.id, "listing.created", item.id, { owner: v.owner });
    return item.id;
  });
}

export async function transitionListing(
  actor: Actor,
  id: string,
  target: "PUBLISHED" | "PAUSED" | "SOLD" | "CLOSED",
) {
  return withTransaction(async (tx) => {
    const item = await findListingOwnershipWithMedia(tx, id);
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
    const updated = await updateListingIfVersion(tx, id, item.version, {
      status: target,
      ...(target === "PUBLISHED"
        ? {
            moderationStatus: "APPROVED",
            publishedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 86400000),
          }
        : {}),
      ...(target === "SOLD" ? { soldAt: new Date() } : {}),
    });
    if (!updated) throw new Error("Listing changed. Please retry.");
    await recordAudit(tx, actor.id, "listing.status", id, {
      from: item.status,
      to: target,
    });
  });
}

export async function deleteListing(actor: Actor, id: string) {
  const media = await withTransaction(async (tx) => {
    const user = await findUser(tx, actor.id);
    const listing = await findListingOwnershipWithMedia(tx, id);

    if (!canManageListing(user, listing)) {
      throw new Error("You cannot delete this listing.");
    }
    if (!(await deleteListingIfVersion(tx, id, listing.version))) {
      throw new Error("The listing changed. Reload and try again.");
    }

    await recordAudit(tx, actor.id, "listing.deleted", id, { title: listing.title });
    return listing.media;
  });

  // Remove files only after the database transaction succeeds.
  await removeListingImages(media.map((image) => image.storageKey));
}
