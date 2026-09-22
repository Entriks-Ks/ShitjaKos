import "server-only";

import type { Actor } from "@/lib/permissions";
import { addFavorite, removeFavorite } from "@/repositories/favorites";
import { getPublicListingMarker } from "@/repositories/listings";

export async function setFavorite(actor: Actor, listingId: string, saved: boolean) {
  if (actor.suspendedAt) {
    throw new Error("This account cannot save listings.");
  }

  if (!saved) {
    await removeFavorite(actor.id, listingId);
    return;
  }

  const listing = await getPublicListingMarker(listingId);
  if (!listing) {
    throw new Error("This listing is no longer available.");
  }

  await addFavorite(actor.id, listingId);
}
