import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { publicWhere } from "@/repositories/listings";
type Tx = Prisma.TransactionClient;

export function performanceOwner(tx: Tx, businessId: string, userId: string) {
  return tx.businessMembership.findFirst({
    where: {
      businessId,
      userId,
      role: "OWNER",
      business: { suspendedAt: null },
      user: { suspendedAt: null, emailVerified: true },
    },
    select: { business: { select: { publicName: true } } },
  });
}

export async function viewBusiness(
  tx: Tx,
  kind: "shop" | "listing",
  id: string,
  userId: string | null,
) {
  const businessId =
    kind === "shop"
      ? id
      : (
          await tx.listing.findFirst({
            where: { id, ...publicWhere(), businessId: { not: null } },
            select: { businessId: true },
          })
        )?.businessId;
  if (!businessId) return null;
  return tx.business.findFirst({
    where: {
      id: businessId,
      suspendedAt: null,
      reviewStatus: "APPROVED",
      ...(userId ? { memberships: { none: { userId } } } : {}),
    },
    select: { id: true },
  });
}

export async function insertPerformanceView(
  tx: Tx,
  data: { businessId: string; target: string; day: Date; visitorHash: string },
) {
  const inserted = await tx.businessPerformanceView.createMany({
    data: [data],
    skipDuplicates: true,
  });
  // The migration's AFTER INSERT trigger increments daily totals atomically,
  // including writes from older instances during deployment. Duplicates do not fire it.
  return inserted;
}

// Atomic fixed windows shared by every web/mobile instance. No raw IPs or IDs.
export async function consumePerformanceBudget(
  tx: Tx,
  key: string,
  maximum: number,
  seconds = 60,
) {
  const rows = await tx.$queryRaw<{ count: number }[]>`
    INSERT INTO "PerformanceBudget" ("key", "count", "expiresAt")
    VALUES (${key}, 1, clock_timestamp() + ${seconds} * interval '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "PerformanceBudget"."expiresAt" <= clock_timestamp() THEN 1 ELSE "PerformanceBudget"."count" + 1 END,
      "expiresAt" = CASE WHEN "PerformanceBudget"."expiresAt" <= clock_timestamp() THEN clock_timestamp() + ${seconds} * interval '1 second' ELSE "PerformanceBudget"."expiresAt" END
    WHERE "PerformanceBudget"."expiresAt" <= clock_timestamp() OR "PerformanceBudget"."count" < ${maximum}
    RETURNING "count"`;
  return rows.length > 0;
}

export async function cleanupPerformance(tx: Tx, now = new Date()) {
  const cutoff = new Date(now.toISOString().slice(0, 10));
  cutoff.setUTCDate(cutoff.getUTCDate() - 1);
  // Bounded batches keep maintenance from holding a busy transaction for long.
  const receipts =
    await tx.$executeRaw`DELETE FROM "BusinessPerformanceView" WHERE "id" IN (SELECT "id" FROM "BusinessPerformanceView" WHERE "day" < ${cutoff} LIMIT 5000)`;
  const budgets =
    await tx.$executeRaw`DELETE FROM "PerformanceBudget" WHERE "key" IN (SELECT "key" FROM "PerformanceBudget" WHERE "expiresAt" < ${now} AND "key" <> 'maintenance' LIMIT 5000)`;
  return { receipts, budgets };
}

export async function performanceTotals(
  tx: Tx,
  businessId: string,
  from: Date,
  until: Date,
) {
  const viewSums = await tx.businessPerformanceDay.groupBy({
    by: ["target"],
    where: { businessId, day: { gte: from, lt: until } },
    _sum: { views: true },
  });
  const views = viewSums.map((v) => ({ target: v.target, views: v._sum.views ?? 0 }));
  const favorites = await tx.favorite.count({
    where: { listing: { businessId }, createdAt: { gte: from, lt: until } },
  });
  const conversations = await tx.conversation.count({
    where: { businessId, createdAt: { gte: from, lt: until } },
  });
  const messages = await tx.message.count({
    where: {
      conversation: { businessId },
      senderSide: "BUYER",
      createdAt: { gte: from, lt: until },
    },
  });
  const daily = await tx.businessPerformanceDay.groupBy({
    by: ["day"],
    where: { businessId, day: { gte: from, lt: until } },
    _sum: { views: true },
    orderBy: { day: "asc" },
  });
  const top = views
    .filter((v) => v.target !== "shop")
    .sort((a, b) => b.views - a.views || a.target.localeCompare(b.target))
    .slice(0, 10);
  const listings = await tx.listing.findMany({
    where: { businessId, id: { in: top.map((v) => v.target) } },
    select: { id: true, title: true, status: true },
  });
  const popular = [];
  const savedCounts = await tx.favorite.groupBy({
    by: ["listingId"],
    where: {
      listing: { businessId },
      listingId: { in: top.map((v) => v.target) },
      createdAt: { gte: from, lt: until },
    },
    _count: { _all: true },
  });
  const inquiryCounts = await tx.conversation.groupBy({
    by: ["sourceListingId"],
    where: {
      businessId,
      sourceListingId: { in: top.map((v) => v.target) },
      createdAt: { gte: from, lt: until },
    },
    _count: { _all: true },
  });
  for (const item of top) {
    const listing = listings.find((l) => l.id === item.target);
    const saved = savedCounts.find((v) => v.listingId === item.target)?._count._all ?? 0;
    const inquiries =
      inquiryCounts.find((v) => v.sourceListingId === item.target)?._count._all ?? 0;
    popular.push({
      id: item.target,
      title: listing?.title ?? "Deleted listing",
      status: listing?.status ?? "DELETED",
      views: item.views,
      favorites: saved,
      inquiries,
    });
  }
  return {
    shopViews: views.find((v) => v.target === "shop")?.views ?? 0,
    listingViews: views
      .filter((v) => v.target !== "shop")
      .reduce((sum, v) => sum + v.views, 0),
    favorites,
    conversations,
    messages,
    popular,
    daily: daily.map((v) => ({
      day: v.day.toISOString().slice(0, 10),
      views: v._sum.views ?? 0,
    })),
  };
}
