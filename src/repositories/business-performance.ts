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
  userId: string,
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
      memberships: { none: { userId } },
    },
    select: { id: true },
  });
}

export function insertPerformanceView(
  tx: Tx,
  data: { businessId: string; target: string; day: Date; visitorHash: string },
) {
  return tx.businessPerformanceView.createMany({ data: [data], skipDuplicates: true });
}

export async function performanceTotals(
  tx: Tx,
  businessId: string,
  from: Date,
  until: Date,
) {
  const views = await tx.businessPerformanceView.groupBy({
    by: ["target"],
    where: { businessId, day: { gte: from, lt: until } },
    _count: { _all: true },
  });
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
  const daily = await tx.businessPerformanceView.groupBy({
    by: ["day"],
    where: { businessId, day: { gte: from, lt: until } },
    _count: { _all: true },
    orderBy: { day: "asc" },
  });
  const top = views
    .filter((v) => v.target !== "shop")
    .sort((a, b) => b._count._all - a._count._all || a.target.localeCompare(b.target))
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
      views: item._count._all,
      favorites: saved,
      inquiries,
    });
  }
  return {
    shopViews: views.find((v) => v.target === "shop")?._count._all ?? 0,
    listingViews: views
      .filter((v) => v.target !== "shop")
      .reduce((sum, v) => sum + v._count._all, 0),
    favorites,
    conversations,
    messages,
    popular,
    daily: daily.map((v) => ({
      day: v.day.toISOString().slice(0, 10),
      views: v._count._all,
    })),
  };
}
