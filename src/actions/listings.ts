"use server";

import { revalidateListing } from "@/lib/revalidation";
import { requireUser } from "@/lib/session";
import { actionErrorMessage } from "@/lib/action-error";
import { saveListing, transitionListing, deleteListing } from "@/services/listings";
import { suggestCategoryFromListingText } from "@/services/suggest-category";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function suggestListingCategoryAction(title: string, description: string) {
  await requireUser();
  try {
    const id = await suggestCategoryFromListingText(
      z.string().max(120).parse(title),
      z.string().max(6000).parse(description),
    );
    return { id };
  } catch {
    return { id: null };
  }
}

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
