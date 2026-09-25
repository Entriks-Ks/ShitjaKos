import "server-only";
import { withTransaction } from "@/repositories/transaction";
import { publicWhere, listingInclude } from "@/repositories/listings";

export function apiProfile(userId: string) {
  return withTransaction((db) =>
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        profile: { select: { displayName: true, city: true, bio: true, phone: true } },
      },
    }),
  );
}
export function apiOwnedListings(userId: string, page: number, limit: number) {
  return withTransaction((db) =>
    db.listing.findMany({
      where: {
        OR: [
          { personalProfile: { userId } },
          {
            business: {
              suspendedAt: null,
              memberships: { some: { userId, role: { in: ["OWNER", "STAFF"] } } },
            },
          },
        ],
      },
      include: listingInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit + 1,
    }),
  );
}
export function apiFavorites(userId: string, page: number, limit: number) {
  return withTransaction((db) =>
    db.favorite.findMany({
      where: { userId, listing: publicWhere() },
      select: { listing: { include: listingInclude } },
      orderBy: [{ createdAt: "desc" }, { listingId: "asc" }],
      skip: (page - 1) * limit,
      take: limit + 1,
    }),
  );
}
const businessSelect = {
  id: true,
  publicName: true,
  legalName: true,
  city: true,
  phone: true,
  email: true,
  description: true,
  reviewStatus: true,
  suspendedAt: true,
  shop: { select: { slug: true, address: true, openingHours: true, tagline: true } },
} as const;
export function apiMemberships(userId: string, page: number, limit: number) {
  return withTransaction((db) =>
    db.businessMembership.findMany({
      where: { userId },
      select: { role: true, business: { select: businessSelect } },
      orderBy: { businessId: "asc" },
      skip: (page - 1) * limit,
      take: limit + 1,
    }),
  );
}
export function apiMembership(userId: string, businessId: string) {
  return withTransaction((db) =>
    db.businessMembership.findUnique({
      where: { userId_businessId: { userId, businessId } },
      select: { role: true, business: { select: businessSelect } },
    }),
  );
}
export function apiPublicListing(id: string) {
  return withTransaction((db) =>
    db.listing.findFirst({
      where: { id, ...publicWhere() },
      include: {
        category: { include: { translations: true } },
        media: { orderBy: { position: "asc" }, select: { id: true, altText: true } },
        attributes: { select: { attributeId: true, value: true } },
        personalProfile: { select: { displayName: true } },
        business: { select: { publicName: true, shop: { select: { slug: true } } } },
      },
    }),
  );
}
export function apiShops(page: number, limit: number) {
  return withTransaction((db) =>
    db.shop.findMany({
      where: { business: { reviewStatus: "APPROVED", suspendedAt: null } },
      select: {
        slug: true,
        tagline: true,
        address: true,
        openingHours: true,
        business: {
          select: {
            id: true,
            publicName: true,
            description: true,
            city: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { slug: "asc" },
      skip: (page - 1) * limit,
      take: limit + 1,
    }),
  );
}
export function apiShopListings(businessId: string, page: number, limit: number) {
  return withTransaction((db) =>
    db.listing.findMany({
      where: { ...publicWhere(), businessId },
      include: listingInclude,
      orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit + 1,
    }),
  );
}
export function apiReviews(userId: string, page: number, limit: number) {
  return withTransaction((db) =>
    db.business.findMany({
      where: { reviewStatus: "PENDING", memberships: { none: { userId } } },
      select: businessSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit + 1,
    }),
  );
}
export function apiAudits(page: number, limit: number) {
  return withTransaction((db) =>
    db.auditEvent.findMany({
      select: {
        id: true,
        action: true,
        targetId: true,
        detail: true,
        createdAt: true,
        actor: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit + 1,
    }),
  );
}
