import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export function getBusinessDeletionContext(
  tx: Prisma.TransactionClient,
  businessId: string,
  userId: string,
) {
  return tx.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    include: {
      user: true,
      business: { include: { _count: { select: { listings: true } } } },
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
