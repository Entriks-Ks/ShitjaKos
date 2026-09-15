import "server-only";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
export function publicWhere(): Prisma.ListingWhereInput {
  return {
    status: "PUBLISHED",
    moderationStatus: "APPROVED",
    category: { active: true, ownerPortal: "SHITJAKOS" },
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      {
        OR: [
          { personalProfile: { user: { suspendedAt: null } } },
          { business: { suspendedAt: null, reviewStatus: "APPROVED" } },
        ],
      },
    ],
  };
}
export const listingInclude = {
  category: { include: { translations: true } },
  media: { orderBy: { position: "asc" as const } },
  personalProfile: { select: { displayName: true } },
  business: { select: { publicName: true, reviewStatus: true, shop: true } },
};

export function getPublicListingMarker(id: string) {
  return getPrisma().listing.findFirst({
    where: { id, ...publicWhere() },
    select: { id: true },
  });
}

export function getListingMedia(id: string) {
  return getPrisma().listingMedia.findUnique({ where: { id } });
}

export function getListingOwnershipDetails(id: string) {
  return getPrisma().listing.findUnique({
    where: { id },
    include: { personalProfile: true, business: { include: { memberships: true } } },
  });
}

export function getListingPreview(id: string) {
  return getPrisma().listing.findUnique({
    where: { id },
    include: {
      category: { include: { translations: true } },
      personalProfile: true,
      business: { include: { shop: true, memberships: true } },
      attributes: { include: { attribute: { include: { translations: true } } } },
      media: { orderBy: { position: "asc" } },
    },
  });
}

export function getEditableListing(id: string) {
  return getPrisma().listing.findUnique({
    where: { id },
    include: {
      personalProfile: true,
      business: { include: { memberships: true } },
      media: { orderBy: { position: "asc" } },
      attributes: true,
    },
  });
}

export function getSimilarListings(categoryId: string, excludeId: string) {
  return getPrisma().listing.findMany({
    where: { ...publicWhere(), categoryId, id: { not: excludeId } },
    include: listingInclude,
    take: 4,
    orderBy: { publishedAt: "desc" },
  });
}
export async function searchListings(params: Record<string, string | undefined>) {
  const where: Prisma.ListingWhereInput = publicWhere();
  const filters: Prisma.ListingWhereInput[] = [];
  if (params.q?.trim())
    for (const word of params.q.trim().slice(0, 120).split(/\s+/).slice(0, 8))
      filters.push({
        OR: [
          { title: { contains: word, mode: "insensitive" } },
          { description: { contains: word, mode: "insensitive" } },
        ],
      });
  if (params.category)
    filters.push({
      OR: [{ categoryId: params.category }, { category: { parentId: params.category } }],
    });
  if (params.city) filters.push({ city: params.city });
  if (params.seller === "private") filters.push({ personalProfileId: { not: null } });
  if (params.seller === "business" || params.seller === "verified")
    filters.push({ businessId: { not: null } });
  if (["FOR_SALE", "WANTED"].includes(params.intent ?? ""))
    filters.push({ intent: params.intent as "FOR_SALE" | "WANTED" });
  if (
    ["NEW", "LIKE_NEW", "USED", "DEFECTIVE", "FOR_PARTS"].includes(params.condition ?? "")
  )
    filters.push({ condition: params.condition as "USED" });
  for (const [field, op] of [
    ["min", "gte"],
    ["max", "lte"],
  ] as const)
    if (
      params[field] &&
      /^\d{1,8}(\.\d{1,2})?$/.test(params[field]!) &&
      Number(params[field]) <= 20000000
    )
      filters.push({ priceCents: { [op]: Math.round(Number(params[field]) * 100) } });
  if (params.attribute && params.value)
    filters.push({
      attributes: {
        some: { attributeId: params.attribute, value: { equals: params.value } },
      },
    });
  const finalWhere = { AND: [where, ...filters] };
  const count = await getPrisma().listing.count({ where: finalWhere });
  const pages = Math.max(1, Math.ceil(count / 12));
  const page = Math.min(
    pages,
    Math.max(1, Math.min(1000, Math.floor(Number(params.page)) || 1)),
  );
  const sort: Prisma.ListingOrderByWithRelationInput =
    params.sort === "price-asc"
      ? { priceCents: "asc" }
      : params.sort === "price-desc"
        ? { priceCents: "desc" }
        : { publishedAt: "desc" };
  const items = await getPrisma().listing.findMany({
    where: finalWhere,
    include: listingInclude,
    orderBy: [sort, { id: "asc" }],
    take: 12,
    skip: (page - 1) * 12,
  });
  // Contact fields are deliberately omitted from public cards.
  return {
    items: items.map(({ contactPhone: _phone, ...item }) => {
      void _phone;
      return item;
    }),
    count,
    page,
    pages,
  };
}
