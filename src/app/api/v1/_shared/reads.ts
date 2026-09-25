import "server-only";
import type { Actor } from "@/lib/permissions";
import { canManageListing, isStaff } from "@/lib/permissions";
import { ApiError, pagination, apiId } from "@/app/api/v1/_shared/input";
import * as records from "@/app/api/v1/_shared/data";
import { getEditableListing, searchListings } from "@/repositories/listings";
import { getPublicShop } from "@/repositories/shops";
import { getCategories, getAdminCatalog } from "@/repositories/catalog";
import { findAdminUsers, findAdminBusinesses } from "@/repositories/admin-accounts";
import { z } from "zod";

type Card = Awaited<ReturnType<typeof searchListings>>["items"][number];
export function listingCard(item: Card) {
  return {
    id: item.id,
    title: item.title,
    priceCents: item.priceCents,
    city: item.city,
    condition: item.condition,
    intent: item.intent,
    negotiable: item.negotiable,
    categoryId: item.categoryId,
    status: item.status,
    version: item.version,
    publishedAt: item.publishedAt,
    seller: item.business
      ? {
          kind: "BUSINESS",
          name: item.business.publicName,
          slug: item.business.shop?.slug ?? null,
        }
      : { kind: "PERSONAL", name: item.personalProfile?.displayName ?? "Seller" },
    media: item.media.map((m) => ({
      id: m.id,
      altText: m.altText,
      url: `/api/v1/media/${m.id}`,
    })),
  };
}
export function pageOf<T>(items: T[], page: number, limit: number) {
  return { items: items.slice(0, limit), page, limit, hasMore: items.length > limit };
}
function active(actor: Actor) {
  if (actor.suspendedAt) throw new ApiError(403, "Account unavailable.");
}
function admin(actor: Actor) {
  if (!isStaff(actor)) throw new ApiError(403, "Admin access required.");
}
export async function readProfile(actor: Actor) {
  active(actor);
  return records.apiProfile(actor.id);
}
export async function readMyListings(actor: Actor, query: unknown) {
  active(actor);
  const { page, limit } = pagination.parse(query);
  return pageOf(
    (await records.apiOwnedListings(actor.id, page, limit)).map(listingCard),
    page,
    limit,
  );
}
export async function readFavorites(actor: Actor, query: unknown) {
  active(actor);
  const { page, limit } = pagination.parse(query);
  return pageOf(
    (await records.apiFavorites(actor.id, page, limit)).map((x) =>
      listingCard(x.listing),
    ),
    page,
    limit,
  );
}
export async function readBusinesses(actor: Actor, query: unknown) {
  active(actor);
  const { page, limit } = pagination.parse(query);
  return pageOf(await records.apiMemberships(actor.id, page, limit), page, limit);
}
export async function readBusiness(actor: Actor, id: string) {
  active(actor);
  const membership = await records.apiMembership(actor.id, apiId.parse(id));
  if (!membership) throw new ApiError(404, "Business not found.");
  return membership;
}
export async function readListing(id: string) {
  const item = await records.apiPublicListing(apiId.parse(id));
  if (!item) throw new ApiError(404, "Listing not found.");
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    priceCents: item.priceCents,
    city: item.city,
    condition: item.condition,
    intent: item.intent,
    negotiable: item.negotiable,
    categoryId: item.categoryId,
    attributes: item.attributes,
    publishedAt: item.publishedAt,
    phoneVisible: item.phoneVisible,
    contactPhone: item.phoneVisible ? item.contactPhone : null,
    seller: item.business
      ? {
          kind: "BUSINESS",
          name: item.business.publicName,
          slug: item.business.shop?.slug ?? null,
        }
      : { kind: "PERSONAL", name: item.personalProfile?.displayName ?? "Seller" },
    media: item.media.map((m) => ({ ...m, url: `/api/v1/media/${m.id}` })),
  };
}
export async function readListingForEdit(actor: Actor, id: string) {
  const item = await getEditableListing(apiId.parse(id));
  if (!item || !canManageListing(actor, item) || item.business?.suspendedAt)
    throw new ApiError(404, "Listing not found.");
  return {
    id: item.id,
    version: item.version,
    title: item.title,
    description: item.description,
    owner: item.businessId ?? "personal",
    categoryId: item.categoryId,
    intent: item.intent,
    price: ((item.priceCents ?? 0) / 100).toFixed(2),
    city: item.city,
    condition: item.condition,
    negotiable: item.negotiable,
    phoneVisible: item.phoneVisible,
    contactPhone: item.contactPhone ?? "",
    attributes: Object.fromEntries(item.attributes.map((a) => [a.attributeId, a.value])),
    media: item.media.map((m) => ({
      id: m.id,
      altText: m.altText,
      url: `/api/v1/media/${m.id}`,
    })),
    status: item.status,
  };
}
const searchInput = pagination.extend({
  q: z.string().max(120).optional(),
  category: apiId.optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(10).optional(),
  seller: z.enum(["private", "business", "verified"]).optional(),
  intent: z.enum(["FOR_SALE", "WANTED"]).optional(),
  condition: z.enum(["NEW", "LIKE_NEW", "USED", "DEFECTIVE", "FOR_PARTS"]).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc"]).optional(),
  min: z
    .string()
    .regex(/^\d{1,8}(\.\d{1,2})?$/)
    .optional(),
  max: z
    .string()
    .regex(/^\d{1,8}(\.\d{1,2})?$/)
    .optional(),
  attribute: apiId.optional(),
  value: z.string().max(200).optional(),
});
export async function readSearch(raw: unknown) {
  const { limit, ...query } = searchInput.parse(raw);
  const result = await searchListings({ ...query, page: String(query.page) }, limit);
  return { ...result, limit, items: result.items.map(listingCard) };
}
export async function readShops(query: unknown) {
  const { page, limit } = pagination.parse(query);
  return pageOf(await records.apiShops(page, limit), page, limit);
}
export async function readShop(slug: string, query: unknown) {
  const shop = await getPublicShop(apiId.parse(slug));
  if (!shop) throw new ApiError(404, "Shop not found.");
  const { page, limit } = pagination.parse(query);
  return {
    slug: shop.slug,
    tagline: shop.tagline,
    address: shop.address,
    openingHours: shop.openingHours,
    business: {
      id: shop.businessId,
      publicName: shop.business.publicName,
      city: shop.business.city,
      description: shop.business.description,
      phone: shop.business.phone,
      email: shop.business.email,
    },
    listings: pageOf(
      (await records.apiShopListings(shop.businessId, page, limit)).map(listingCard),
      page,
      limit,
    ),
  };
}
export async function readCatalog() {
  return { items: await getCategories() };
}
export async function readAdminCatalog(actor: Actor) {
  admin(actor);
  return { items: await getAdminCatalog() };
}
export async function readAdminAccounts(
  actor: Actor,
  kind: "users" | "businesses",
  query: unknown,
) {
  admin(actor);
  const { page, q } = pagination
    .extend({ q: z.string().max(120).default("") })
    .parse(query);
  const result =
    kind === "users" ? await findAdminUsers(q, page) : await findAdminBusinesses(q, page);
  return { ...result, page, limit: 20 };
}
export async function readAdminQueue(
  actor: Actor,
  kind: "reviews" | "audits",
  query: unknown,
) {
  admin(actor);
  const { page, limit } = pagination.parse(query);
  if (kind === "reviews")
    return pageOf(await records.apiReviews(actor.id, page, limit), page, limit);
  return pageOf(await records.apiAudits(page, limit), page, limit);
}
