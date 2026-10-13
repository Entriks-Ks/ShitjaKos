import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export function getBusinessDeletionContext(
  tx: Prisma.TransactionClient,
  businessId: string,
  userId: string,
) {
  return tx.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    include: {
      user: true,
      business: {
        include: { shop: true, _count: { select: { listings: true } } },
      },
    },
  });
}

export type BusinessWriteData = Omit<
  Prisma.BusinessUncheckedCreateInput,
  "id" | "createdAt" | "updatedAt" | "memberships" | "shop" | "listings"
>;

export function findBusinessMembership(
  tx: Prisma.TransactionClient,
  userId: string,
  businessId: string,
) {
  return tx.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    include: { business: true },
  });
}

export function findBusinessWithMemberships(tx: Prisma.TransactionClient, id: string) {
  return tx.business.findUniqueOrThrow({
    where: { id },
    include: { memberships: true },
  });
}

export function createBusinessWithOwner(
  tx: Prisma.TransactionClient,
  input: {
    data: BusinessWriteData;
    ownerId: string;
    shop: { slug: string; address: string; openingHours: string };
  },
) {
  return tx.business.create({
    data: {
      ...input.data,
      memberships: { create: { userId: input.ownerId, role: "OWNER" } },
      shop: { create: input.shop },
    },
  });
}

export async function updateBusinessDetails(
  tx: Prisma.TransactionClient,
  id: string,
  data: Prisma.BusinessUncheckedUpdateInput,
  shop?: { address?: string; openingHours?: string },
) {
  await tx.business.update({
    where: { id },
    data: { ...data, shop: shop ? { update: shop } : undefined },
  });
}

export async function setBusinessReviewStatus(
  tx: Prisma.TransactionClient,
  id: string,
  decision: "APPROVED" | "REJECTED",
) {
  await tx.business.update({
    where: { id },
    data: { reviewStatus: decision, reviewedAt: new Date() },
  });
}

export async function removeEmptyBusiness(tx: Prisma.TransactionClient, id: string) {
  await tx.shop.deleteMany({ where: { businessId: id } });
  await tx.businessMembership.deleteMany({ where: { businessId: id } });
  // The listing foreign key restricts deletion if a listing was added concurrently.
  await tx.business.delete({ where: { id } });
}

export function findSelectableBusinessCategories(
  tx: Prisma.TransactionClient,
  ids: string[],
) {
  return tx.category.findMany({
    where: {
      id: { in: ids },
      parentId: null,
      active: true,
      ownerPortal: "SHITJAKOS",
    },
    select: { id: true },
  });
}

export async function replaceBusinessCategories(
  tx: Prisma.TransactionClient,
  businessId: string,
  categoryIds: string[],
) {
  await tx.businessCategory.deleteMany({
    where: { businessId },
  });

  await tx.businessCategory.createMany({
    data: categoryIds.map((categoryId, position) => ({
      businessId,
      categoryId,
      position,
    })),
  });
}

export async function lockBusinessForUpdate(
  tx: Prisma.TransactionClient,
  businessId: string,
) {
  await tx.$queryRaw`
    SELECT "id"
    FROM "Business"
    WHERE "id" = ${businessId}
    FOR UPDATE
  `;
}

export async function lockBusinessActor(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`
    SELECT "id"
    FROM "User"
    WHERE "id" = ${userId}
    FOR SHARE
  `;

  return tx.user.findUniqueOrThrow({
    where: { id: userId },
  });
}

export function getBusinessCategoryOptions() {
  return getPrisma().category.findMany({
    where: {
      parentId: null,
      active: true,
      ownerPortal: "SHITJAKOS",
    },
    include: { translations: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

export function getBusinessCategorySelection(businessId: string) {
  return getPrisma().businessCategory.findMany({
    where: { businessId },
    include: {
      category: {
        include: { translations: true },
      },
    },
    orderBy: { position: "asc" },
  });
}
