import "server-only";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { countryById } from "@/lib/catalog";
import {
  expandSearchWords,
  normalizeSearchText,
  parseNaturalSearch,
  searchWords,
} from "@/lib/listing-search";

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
  media: {
    orderBy: { position: "asc" as const },
    take: 1,
    select: { id: true, altText: true },
  },
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

export function getPublicListingMedia(id: string) {
  return getPrisma().listingMedia.findFirst({
    where: { id, listing: publicWhere() },
    select: { id: true, storageKey: true },
  });
}

export function getListingOwnershipDetails(id: string) {
  return getPrisma().listing.findUnique({
    where: { id },
    include: { personalProfile: true, business: { include: { memberships: true } } },
  });
}

export type ListingWriteData = Pick<
  Prisma.ListingUncheckedCreateInput,
  | "title"
  | "description"
  | "categoryId"
  | "intent"
  | "priceCents"
  | "city"
  | "condition"
  | "negotiable"
  | "phoneVisible"
  | "contactPhone"
>;

export type ListingAttributeWrite = {
  attributeId: string;
  value: Prisma.InputJsonValue;
};

export type ListingAdditionalDataWrite = {
  name: string;
  value: string;
  position: number;
};

export function findListingOwnership(tx: Prisma.TransactionClient, id: string) {
  return tx.listing.findUniqueOrThrow({
    where: { id },
    include: { personalProfile: true, business: { include: { memberships: true } } },
  });
}

export function findListingOwnershipWithMedia(tx: Prisma.TransactionClient, id: string) {
  return tx.listing.findUniqueOrThrow({
    where: { id },
    include: {
      personalProfile: true,
      business: { include: { memberships: true } },
      media: true,
    },
  });
}

export function findListingOwnershipWithOrderedMedia(
  id: string,
  client: Prisma.TransactionClient = getPrisma(),
) {
  return client.listing.findUnique({
    where: { id },
    include: {
      personalProfile: true,
      business: { include: { memberships: true } },
      media: { orderBy: { position: "asc" } },
    },
  });
}

export function createListing(
  tx: Prisma.TransactionClient,
  input: {
    data: ListingWriteData;
    attributes: ListingAttributeWrite[];
    additionalData: ListingAdditionalDataWrite[];
    createdById: string;
    personalProfileId: string | null;
    businessId: string | null;
  },
) {
  return tx.listing.create({
    data: {
      ...input.data,
      moderationStatus: "APPROVED",
      createdById: input.createdById,
      personalProfileId: input.personalProfileId,
      businessId: input.businessId,
      attributes: { create: input.attributes },
      additionalData: { create: input.additionalData },
    },
  });
}

// Every listing write goes through the optimistic lock, so the version bump
// lives here rather than at each call site. Returns false on a lost race.
export async function updateListingIfVersion(
  tx: Prisma.TransactionClient,
  id: string,
  version: number,
  data: Prisma.ListingUncheckedUpdateManyInput = {},
) {
  const changed = await tx.listing.updateMany({
    where: { id, version },
    data: { ...data, version: { increment: 1 } },
  });
  return changed.count === 1;
}

export async function deleteListingIfVersion(
  tx: Prisma.TransactionClient,
  id: string,
  version: number,
) {
  const deleted = await tx.listing.deleteMany({ where: { id, version } });
  return deleted.count === 1;
}

export async function replaceListingAttributes(
  tx: Prisma.TransactionClient,
  listingId: string,
  attributes: ListingAttributeWrite[],
) {
  await tx.listingAttributeValue.deleteMany({ where: { listingId } });
  await tx.listingAttributeValue.createMany({
    data: attributes.map((attribute) => ({ ...attribute, listingId })),
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
      additionalData: { orderBy: { position: "asc" } },
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
      additionalData: {
        orderBy: { position: "asc" },
      },
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
export function buildListingSearchWhere(
  params: Record<string, string | undefined>,
): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = publicWhere();
  const filters: Prisma.ListingWhereInput[] = [];
  if (params.q?.trim())
    for (const word of params.q.trim().slice(0, 120).split(/\s+/).slice(0, 8))
      filters.push({
        OR: [
          { title: { contains: word, mode: "insensitive" } },
          { description: { contains: word, mode: "insensitive" } },
          {
            category: {
              OR: [
                { slug: { contains: word, mode: "insensitive" } },
                {
                  translations: {
                    some: { name: { contains: word, mode: "insensitive" } },
                  },
                },
              ],
            },
          },
        ],
      });
  if (params.category)
    filters.push({
      OR: [{ categoryId: params.category }, { category: { parentId: params.category } }],
    });
  if (params.city) filters.push({ city: params.city });
  else if (params.country) {
    const country = countryById(params.country);
    if (country) filters.push({ city: { in: [...country.cities] } });
  }
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
  return { AND: [where, ...filters] };
}

async function fuzzyListingIds(query: string) {
  const words = searchWords(query);
  let matchingIds: Set<string> | undefined;

  for (const word of words) {
    const variants = expandSearchWords([word]);
    const threshold = word.length <= 4 ? 0.65 : word.length <= 6 ? 0.55 : 0.5;
    const rows = await getPrisma().$queryRaw<Array<{ id: string }>>`
      SELECT DISTINCT l.id
      FROM "Listing" l
      JOIN "Category" c ON c.id = l."categoryId"
      WHERE
        ${Prisma.join(
          variants.map(
            (
              variant,
            ) => Prisma.sql`word_similarity(unaccent(${variant}), unaccent(l.title)) >= ${threshold}
              OR word_similarity(unaccent(${variant}), unaccent(l.description)) >= ${threshold}
              OR word_similarity(unaccent(${variant}), unaccent(c.slug)) >= ${threshold}
              OR EXISTS (
                SELECT 1 FROM "CategoryTranslation" ct
                WHERE ct."categoryId" = c.id
                  AND word_similarity(unaccent(${variant}), unaccent(ct.name)) >= ${threshold}
              )`,
          ),
          " OR ",
        )}
    `;
    const ids = new Set(rows.map((row) => row.id));
    matchingIds = matchingIds
      ? new Set([...matchingIds].filter((id) => ids.has(id)))
      : ids;
    if (!matchingIds.size) return [];
  }

  return [...(matchingIds ?? [])];
}

async function rankedListingIds(query: string, ids: string[]) {
  if (!ids.length) return ids;
  const words = expandSearchWords(searchWords(query));
  if (!words.length) return ids;
  const rows = await getPrisma().$queryRaw<Array<{ id: string; score: number }>>`
    SELECT l.id,
      (
        CASE WHEN unaccent(lower(l.title)) LIKE '%' || unaccent(lower(${normalizeSearchText(query)})) || '%' THEN 100 ELSE 0 END
        + CASE WHEN unaccent(lower(c.slug)) LIKE '%' || unaccent(lower(${normalizeSearchText(query)})) || '%' THEN 80 ELSE 0 END
        + GREATEST(
            ${Prisma.join(
              words.map(
                (word) =>
                  Prisma.sql`word_similarity(unaccent(${word}), unaccent(l.title))`,
              ),
              " + ",
            )}
          )
      )::float8 AS score
    FROM "Listing" l
    JOIN "Category" c ON c.id = l."categoryId"
    WHERE l.id IN (${Prisma.join(ids)})
    ORDER BY score DESC, l."publishedAt" DESC NULLS LAST, l.id ASC
  `;
  return rows.map((row) => row.id);
}

export async function searchListings(
  params: Record<string, string | undefined>,
  pageSize = 12,
) {
  const natural = params.q ? parseNaturalSearch(params.q) : {};
  const effectiveParams = { ...natural, ...params };
  const fuzzyIds = params.q?.trim() ? await fuzzyListingIds(params.q) : undefined;
  const rankedIds =
    fuzzyIds && params.q ? await rankedListingIds(params.q, fuzzyIds) : undefined;
  const finalWhere = {
    AND: [
      buildListingSearchWhere({ ...effectiveParams, q: undefined }),
      ...(fuzzyIds ? [{ id: { in: fuzzyIds } }] : []),
    ],
  } satisfies Prisma.ListingWhereInput;
  const requestedPage = Math.max(1, Math.min(1000, Math.floor(Number(params.page)) || 1));
  const sort: Prisma.ListingOrderByWithRelationInput =
    params.sort === "price-asc"
      ? { priceCents: "asc" }
      : params.sort === "price-desc"
        ? { priceCents: "desc" }
        : { publishedAt: "desc" };
  const size = pageSize;
  const readPage = async (page: number) => {
    const pageIds = rankedIds?.slice((page - 1) * size, page * size);
    const items = pageIds
      ? await getPrisma().listing.findMany({
          where: { AND: [finalWhere, { id: { in: pageIds } }] },
          include: listingInclude,
          orderBy: { id: "asc" },
        })
      : await getPrisma().listing.findMany({
          where: finalWhere,
          include: listingInclude,
          orderBy: [sort, { id: "asc" as const }],
          take: size,
          skip: (page - 1) * size,
        });
    if (!pageIds) return items;
    const byId = new Map(items.map((item) => [item.id, item]));
    return pageIds.flatMap((id) => {
      const item = byId.get(id);
      return item ? [item] : [];
    });
  };
  const [count, requestedItems] = await Promise.all([
    getPrisma().listing.count({ where: finalWhere }),
    readPage(requestedPage),
  ]);
  const pages = Math.max(1, Math.ceil(count / size));
  const page = Math.min(pages, requestedPage);
  const items = page === requestedPage ? requestedItems : await readPage(page);
  if (params.q?.trim()) {
    await getPrisma().searchEvent.create({
      data: {
        query: normalizeSearchText(params.q),
        resultCount: count,
        hasFilters: Object.entries(effectiveParams).some(
          ([key, value]) => key !== "q" && key !== "page" && Boolean(value),
        ),
      },
    });
  }
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

export async function replaceListingAdditionalData(
  tx: Prisma.TransactionClient,
  listingId: string,
  additionalData: ListingAdditionalDataWrite[],
) {
  await tx.listingAdditionalData.deleteMany({
    where: { listingId },
  });

  if (!additionalData.length) {
    return;
  }

  await tx.listingAdditionalData.createMany({
    data: additionalData.map((row) => ({
      listingId,
      name: row.name,
      value: row.value,
      position: row.position,
    })),
  });
}
