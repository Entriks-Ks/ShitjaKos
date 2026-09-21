import "server-only";

import { getPrisma } from "@/lib/prisma";
import { listingInclude, publicWhere } from "@/repositories/listings";

export async function isFavorited(userId: string, listingId: string) {
  const favorite = await getPrisma().favorite.findUnique({
    where: {
      userId_listingId: { userId, listingId },
    },
    select: { userId: true },
  });

  return favorite !== null;
}

export async function getFavoriteListingIds(userId: string, listingIds: string[]) {
  if (!listingIds.length) return [];

  const favorites = await getPrisma().favorite.findMany({
    where: {
      userId,
      listingId: { in: listingIds },
    },
    select: { listingId: true },
  });

  return favorites.map((favorite) => favorite.listingId);
}

export function getVisibleFavorites(userId: string) {
  return getPrisma().favorite.findMany({
    where: {
      userId,
      listing: { is: publicWhere() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      listing: {
        include: listingInclude,
      },
    },
  });
}
