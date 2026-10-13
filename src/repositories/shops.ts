import "server-only";
import { getPrisma } from "@/lib/prisma";
import { publicWhere, listingInclude } from "@/repositories/listings";
import type { Prisma } from "@/generated/prisma/client";
import type { ShopImageKind } from "@/lib/shop-images";

const approvedBusiness = { reviewStatus: "APPROVED" as const, suspendedAt: null };

export const publicBusinessCategories = {
  where: { category: { active: true, parentId: null, ownerPortal: "SHITJAKOS" } },
  include: { category: { include: { translations: true } } },
  orderBy: { position: "asc" as const },
};
export function publicShopWhere(
  filters: { category?: string; city?: string } = {},
): Prisma.ShopWhereInput {
  return {
    business: {
      ...approvedBusiness,
      ...(filters.city ? { city: filters.city } : {}),
      ...(filters.category
        ? {
            categories: {
              some: {
                categoryId: filters.category,
                category: { active: true, parentId: null, ownerPortal: "SHITJAKOS" },
              },
            },
          }
        : {}),
    },
  };
}
export function getPublicShops(filters: { category?: string; city?: string } = {}) {
  return getPrisma().shop.findMany({
    where: publicShopWhere(filters),
    include: { business: { include: { categories: publicBusinessCategories } } },
    orderBy: { slug: "asc" },
    take: 100,
  });
}

export function getPublicShop(slug: string) {
  return getPrisma().shop.findFirst({
    where: { slug, business: approvedBusiness },
    include: { business: { include: { categories: publicBusinessCategories } } },
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
