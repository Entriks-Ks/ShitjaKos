"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentActor } from "@/lib/session";
import { setFavorite } from "@/services/favorites";

const input = z.object({
  listingId: z.string().min(1).max(100),
  saved: z.boolean(),
});

export async function setFavoriteAction(listingId: string, saved: boolean) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  const parsed = input.safeParse({ listingId, saved });

  if (!parsed.success) {
    return { saved: null, error: "Invalid favorite request." };
  }

  try {
    await setFavorite(actor, parsed.data.listingId, parsed.data.saved);

    revalidatePath(`/listings/${parsed.data.listingId}`);
    revalidatePath("/dashboard/favorites");

    return { saved: parsed.data.saved, error: "" };
  } catch {
    return { saved: null, error: "Could not update this favorite." };
  }
}
