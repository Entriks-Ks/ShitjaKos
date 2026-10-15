import "server-only";
import { getPrisma } from "@/lib/prisma";
import { publicWhere, listingInclude } from "@/repositories/listings";
import { searchWords } from "@/lib/listing-search";
import type { Prisma } from "@/generated/prisma/client";
import type { ShopImageKind } from "@/lib/shop-images";
import type { ShopFilters } from "@/lib/validations/business-categories";

const approvedBusiness = { reviewStatus: "APPROVED" as const, suspendedAt: null };

export const publicBusinessCategories = {
  where: { category: { active: true, parentId: null, ownerPortal: "SHITJAKOS" } },
  include: { category: { include: { translations: true } } },
  orderBy: { position: "asc" as const },
};
function shopQueryClauses(query?: string): Prisma.ShopWhereInput[] {
  const raw = query?.trim().slice(0, 120) ?? "";
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .slice(0, 8)
    .map((word) => {
      const variants = [...new Set([word, ...searchWords(word)])];
      return {
        OR: variants.flatMap((variant) => [
          { slug: { contains: variant, mode: "insensitive" } },
          { tagline: { contains: variant, mode: "insensitive" } },
          { business: { publicName: { contains: variant, mode: "insensitive" } } },
        ]),
      };
    });
}

export function publicShopWhere(filters: ShopFilters = {}): Prisma.ShopWhereInput {
  const query = shopQueryClauses(filters.q);
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
    ...(query.length ? { AND: query } : {}),
  };
}
export function getPublicShops(filters: ShopFilters = {}) {
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
