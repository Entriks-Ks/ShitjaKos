import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { listingInclude, publicWhere } from "@/repositories/listings";

export async function addFavorite(
  userId: string,
  listingId: string,
  client: Prisma.TransactionClient = getPrisma(),
) {
  await client.favorite.upsert({
    where: { userId_listingId: { userId, listingId } },
    create: { userId, listingId },
    update: {},
  });
}

export async function removeFavorite(
  userId: string,
  listingId: string,
  client: Prisma.TransactionClient = getPrisma(),
) {
  await client.favorite.deleteMany({ where: { userId, listingId } });
}

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
