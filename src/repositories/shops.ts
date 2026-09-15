import "server-only";
import { getPrisma } from "@/lib/prisma";
import { publicWhere, listingInclude } from "@/repositories/listings";

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
