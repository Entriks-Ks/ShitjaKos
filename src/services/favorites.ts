import "server-only";

import type { Actor } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { getPublicListingMarker } from "@/repositories/listings";

export async function setFavorite(actor: Actor, listingId: string, saved: boolean) {
  if (actor.suspendedAt) {
    throw new Error("This account cannot save listings.");
  }

  if (saved) {
    const listing = await getPublicListingMarker(listingId);

    if (!listing) {
      throw new Error("This listing is no longer available.");
    }

    await getPrisma().favorite.upsert({
      where: {
        userId_listingId: {
          userId: actor.id,
          listingId,
        },
      },
      create: {
        userId: actor.id,
        listingId,
      },
      update: {},
    });

    return;
  }

  await getPrisma().favorite.deleteMany({
    where: {
      userId: actor.id,
      listingId,
    },
  });
}
