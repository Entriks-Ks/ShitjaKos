"use server";

import { revalidateListing } from "@/lib/revalidation";
import { requireUser } from "@/lib/session";
import { actionErrorMessage } from "@/lib/action-error";
import { saveListing, transitionListing } from "@/services/listings";
import { deleteListing } from "@/services/listings";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function saveListingAction(raw: unknown) {
  const user = await requireUser();
  try {
    const id = await saveListing(user, raw);
    revalidateListing(id);
    return { id };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function statusAction(
  id: string,
  target: "PUBLISHED" | "PAUSED" | "SOLD" | "CLOSED",
) {
  const user = await requireUser();
  try {
    await transitionListing(user, id, target);
    revalidateListing(id);
    return { ok: true };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}

export async function deleteListingAction(listingId: string) {
  const user = await requireUser();

  try {
    const id = z.string().min(1).max(100).parse(listingId);

    await deleteListing(user, id);

    revalidateListing(id);
    revalidatePath("/dashboard/favorites");

    return { ok: true };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}
