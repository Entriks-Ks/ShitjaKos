import "server-only";
import { getPrisma } from "@/lib/prisma";
import { publicWhere, listingInclude } from "@/repositories/listings";
import type { Prisma } from "@/generated/prisma/client";
import type { ShopImageKind } from "@/lib/shop-images";

const approvedBusiness = { reviewStatus: "APPROVED" as const, suspendedAt: null };

export function getPublicShops() {
  return getPrisma().shop.findMany({
    where: { business: approvedBusiness },
    include: { business: true },
    orderBy: { slug: "asc" },
    take: 100,
  });
}

export function getPublicShop(slug: string) {
  return getPrisma().shop.findFirst({
    where: { slug, business: approvedBusiness },
    include: { business: true },
  });
}

export function getPublicShopListings(businessId: string) {
  return getPrisma().listing.findMany({
    where: { ...publicWhere(), businessId },
    include: listingInclude,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: 100,
  });
}

export function findShopByBusinessId(
  businessId: string,
  client: Prisma.TransactionClient | ReturnType<typeof getPrisma> = getPrisma(),
) {
  return client.shop.findUnique({
    where: { businessId },
    include: { business: { include: { memberships: true } } },
  });
}

export function setShopImageKey(
  tx: Prisma.TransactionClient,
  businessId: string,
  kind: ShopImageKind,
  fileKey: string | null,
) {
  return tx.shop.update({
    where: { businessId },
    data: kind === "logo" ? { logoKey: fileKey } : { backgroundKey: fileKey },
  });
}
