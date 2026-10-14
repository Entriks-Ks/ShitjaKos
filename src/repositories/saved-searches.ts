import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { buildListingSearchWhere, publicWhere } from "@/repositories/listings";
import type { SavedSearchFilters } from "@/lib/validations/saved-searches";

type Tx = Prisma.TransactionClient;
export async function lockSavedSearchUser(tx: Tx, id: string, exclusive = false) {
  if (exclusive) await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;
  else await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR SHARE`;
  return tx.user.findUnique({
    where: { id },
    select: { id: true, suspendedAt: true, deletedAt: true, emailVerified: true },
  });
}
export function countSavedSearches(tx: Tx, userId: string) {
  return tx.savedSearch.count({ where: { userId } });
}
export function findSavedSearch(tx: Tx, userId: string, id: string) {
  return tx.savedSearch.findFirst({ where: { id, userId } });
}
export function findDuplicateSearch(tx: Tx, userId: string, filterHash: string) {
  return tx.savedSearch.findUnique({
    where: { userId_filterHash: { userId, filterHash } },
  });
}
export async function searchCatalogValid(tx: Tx, filters: SavedSearchFilters) {
  if (
    filters.category &&
    !(await tx.category.findFirst({
      where: { id: filters.category, active: true, ownerPortal: "SHITJAKOS" },
      select: { id: true },
    }))
  )
    return false;
  if (
    filters.attribute &&
    !(await tx.attributeDefinition.findFirst({
      where: { id: filters.attribute, categoryId: filters.category, filterable: true },
      select: { id: true },
    }))
  )
    return false;
  return true;
}
export function insertSavedSearch(tx: Tx, data: Prisma.SavedSearchUncheckedCreateInput) {
  return tx.savedSearch.create({ data });
}
export function updateSavedSearchRecord(
  tx: Tx,
  id: string,
  data: Prisma.SavedSearchUpdateInput,
) {
  return tx.savedSearch.update({ where: { id }, data });
}
export function removeSavedSearch(tx: Tx, userId: string, id: string) {
  return tx.savedSearch.deleteMany({ where: { id, userId } });
}
export function listSavedSearchRecords(tx: Tx, userId: string) {
  return tx.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}
export function listSavedSearchAlerts(tx: Tx, userId: string, page: number) {
  return tx.savedSearchAlert.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
    skip: (page - 1) * 20,
    include: {
      savedSearch: { select: { name: true, filters: true } },
      matches: {
        where: { listing: publicWhere() },
        take: 100,
        select: { listing: { select: { id: true, title: true } } },
      },
    },
  });
}
export function markSavedSearchAlertsRead(tx: Tx, userId: string, id?: string) {
  return tx.savedSearchAlert.updateMany({
    where: { userId, ...(id ? { id } : {}), readAt: null },
    data: { readAt: new Date() },
  });
}
export async function savedSearchAlertSummary(tx: Tx, userId: string) {
  const unread = await tx.savedSearchAlert.count({ where: { userId, readAt: null } });
  const latest = await tx.savedSearchAlert.findFirst({
    where: { userId, readAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, createdAt: true, savedSearch: { select: { name: true } } },
  });
  return {
    savedSearchUnread: unread,
    latestSavedSearch: latest
      ? {
          id: latest.id,
          title: latest.savedSearch.name,
          createdAt: latest.createdAt.toISOString(),
        }
      : null,
  };
}
export function dueSavedSearches(limit: number) {
  return getPrisma().savedSearch.findMany({
    where: {
      nextRunAt: { lte: new Date() },
      frequency: { not: "OFF" },
      user: { suspendedAt: null, deletedAt: null, emailVerified: true },
    },
    orderBy: { nextRunAt: "asc" },
    take: limit,
    select: { id: true, userId: true },
  });
}
export async function claimDueSearch(tx: Tx, id: string, userId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "SavedSearch" WHERE id = ${id} AND "userId" = ${userId}
      AND "nextRunAt" <= timezone('UTC', CURRENT_TIMESTAMP) AND frequency <> 'OFF'::"SavedSearchFrequency"
    FOR UPDATE SKIP LOCKED`;
  return rows.length ? findSavedSearch(tx, userId, id) : null;
}
export function findNewSearchMatches(
  tx: Tx,
  search: { id: string; userId: string; eligibleSince: Date },
  filters: SavedSearchFilters,
  listingId?: string,
) {
  return tx.listing.findMany({
    where: {
      AND: [
        ...(listingId ? [{ id: listingId }] : []),
        buildListingSearchWhere(filters),
        {
          firstPublication: { createdAt: { gt: search.eligibleSince } },
          savedSearchMatches: { none: { savedSearchId: search.id } },
          NOT: {
            OR: [
              { personalProfile: { userId: search.userId } },
              { business: { memberships: { some: { userId: search.userId } } } },
            ],
          },
        },
      ],
    },
    orderBy: [{ firstPublication: { createdAt: "asc" } }, { id: "asc" }],
    take: 101,
    select: { id: true },
  });
}
export function insertSavedSearchAlert(
  tx: Tx,
  search: { id: string; userId: string },
  listingIds: string[],
) {
  return tx.savedSearchAlert.create({
    data: {
      userId: search.userId,
      savedSearchId: search.id,
      // Every new alert has a durable email delivery entry. Scheduling belongs to the service.
      emailNextAttemptAt: new Date(),
      matches: {
        create: listingIds.map((listingId) => ({ listingId, savedSearchId: search.id })),
      },
    },
  });
}

export async function savedSearchClock(tx: Tx) {
  const rows = await tx.$queryRaw<
    Array<{ now: Date }>
  >`SELECT timezone('UTC', clock_timestamp()) AS now`;
  return rows[0].now;
}

// A durable email outbox on the alert row. Claim atomically; SMTP runs after commit.
export async function claimSavedSearchEmail(tx: Tx, token: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    UPDATE "SavedSearchAlert" SET
      "emailLeaseToken" = ${token},
      "emailAttempts" = "emailAttempts" + 1,
      "emailNextAttemptAt" = timezone('UTC', clock_timestamp()) + interval '5 minutes'
    WHERE id = (
      SELECT id FROM "SavedSearchAlert"
      WHERE "emailNextAttemptAt" <= timezone('UTC', clock_timestamp())
        AND "emailSentAt" IS NULL AND "emailAttempts" < 8
      ORDER BY "emailNextAttemptAt", id
      FOR UPDATE SKIP LOCKED LIMIT 1
    ) RETURNING id`;
  if (!rows.length) return null;
  return tx.savedSearchAlert.findUnique({
    where: { id: rows[0].id },
    include: {
      user: {
        select: { email: true, emailVerified: true, suspendedAt: true, deletedAt: true },
      },
      savedSearch: { select: { name: true, frequency: true } },
      matches: {
        where: { listing: publicWhere() },
        select: { listing: { select: { id: true, title: true } } },
        take: 100,
      },
    },
  });
}

export function finishSavedSearchEmail(
  tx: Tx,
  id: string,
  token: string,
  data: Pick<
    Prisma.SavedSearchAlertUpdateManyMutationInput,
    "emailSentAt" | "emailNextAttemptAt" | "emailLastError"
  >,
) {
  return tx.savedSearchAlert.updateMany({
    where: { id, emailLeaseToken: token },
    data: { ...data, emailLeaseToken: null },
  });
}
