import "server-only";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { cities } from "@/lib/catalog";
import { Actor, assertBusinessDeletionAllowed } from "@/lib/permissions";
import { recordAudit } from "@/repositories/audit";
import { withTransaction } from "@/repositories/transaction";
import { findUser } from "@/repositories/users";
import {
  createBusinessWithOwner,
  findBusinessWithMemberships,
  getBusinessDeletionContext,
  removeEmptyBusiness,
  updateBusinessDetails,
} from "@/repositories/businesses";
import { removeShopImage } from "@/lib/shop-images";
import { saveShopImage } from "@/services/shop-images";

export async function deleteBusiness(actor: Actor, businessId: string) {
  const images = await withTransaction(async (tx) => {
    const membership = await getBusinessDeletionContext(tx, businessId, actor.id);
    assertBusinessDeletionAllowed(
      membership?.user ?? actor,
      membership,
      membership?.business._count.listings ?? 0,
    );
    const shop = membership!.business.shop;
    await removeEmptyBusiness(tx, businessId);
    await recordAudit(tx, actor.id, "business.deleted", businessId, {
      publicName: membership!.business.publicName,
    });
    return { logoKey: shop?.logoKey, backgroundKey: shop?.backgroundKey };
  });
  if (images.logoKey) await removeShopImage("logo", images.logoKey);
  if (images.backgroundKey) await removeShopImage("background", images.backgroundKey);
}

const input = z.object({
  legalName: z.string().trim().min(3).max(150),
  publicName: z.string().trim().min(3).max(100),
  city: z.enum(cities),
  phone: z.string().regex(/^\+?[\d\s()-]{7,25}$/),
  email: z.email(),
  description: z.string().trim().min(20).max(2000),
  address: z.string().max(200),
  openingHours: z.string().max(300),
});

function shopSlug(publicName: string) {
  const base =
    publicName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "shop";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export async function createBusiness(actor: Actor, raw: unknown) {
  const v = input.parse(raw);
  if (actor.suspendedAt) throw new Error("Account suspended.");
  return withTransaction(async (tx) => {
    const user = await findUser(tx, actor.id);
    if (!user.emailVerified || user.suspendedAt)
      throw new Error("An active, verified account is required.");
    const { address, openingHours, ...data } = v;
    const business = await createBusinessWithOwner(tx, {
      data,
      ownerId: actor.id,
      shop: { slug: shopSlug(v.publicName), address, openingHours },
    });
    await recordAudit(tx, actor.id, "business.submitted", business.id, {});
    return business.id;
  });
}

export async function createBusinessWithImages(
  actor: Actor,
  raw: unknown,
  images: {
    logo?: FormDataEntryValue | null;
    background?: FormDataEntryValue | null;
  },
) {
  const id = await createBusiness(actor, raw);

  try {
    if (images.logo instanceof File && images.logo.size > 0) {
      await saveShopImage(actor, id, "logo", images.logo);
    }

    if (images.background instanceof File && images.background.size > 0) {
      await saveShopImage(actor, id, "background", images.background);
    }

    return {
      id,
      images: {
        logo: images.logo instanceof File && images.logo.size > 0,
        background: images.background instanceof File && images.background.size > 0,
      },
    };
  } catch (error) {
    // Do not leave a duplicate pending business when initial image validation
    // or storage fails. A newly created business has no listings yet.
    try {
      await deleteBusiness(actor, id);
    } catch (rollbackError) {
      console.error(
        "Could not roll back business after initial image upload failed.",
        rollbackError instanceof Error ? rollbackError.name : "UnknownError",
      );
    }

    throw error;
  }
}

export async function updateBusiness(actor: Actor, businessId: string, raw: unknown) {
  const v = input.partial().parse(raw);
  if (actor.suspendedAt) throw new Error("Account suspended.");
  return withTransaction(async (tx) => {
    const business = await findBusinessWithMemberships(tx, businessId);
    const membership = business.memberships.find((m) => m.userId === actor.id);
    if (!membership || membership.role !== "OWNER")
      throw new Error("Not authorized to update this business.");
    const { address, openingHours, ...data } = v;
    await updateBusinessDetails(
      tx,
      businessId,
      data,
      address !== undefined || openingHours !== undefined
        ? { address, openingHours }
        : undefined,
    );
    await recordAudit(tx, actor.id, "business.updated", businessId, {});
  });
}
