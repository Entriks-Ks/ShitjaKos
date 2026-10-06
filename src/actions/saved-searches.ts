"use server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireUser } from "@/lib/session";
import * as searches from "@/services/saved-searches";

function failure(error: unknown) {
  return {
    error:
      error instanceof searches.SavedSearchError
        ? error.message
        : error instanceof ZodError
          ? (error.issues[0]?.message ?? "Invalid search.")
          : "Could not update saved searches. Please retry.",
  };
}
export async function saveSearchAction(raw: unknown, id?: string) {
  const actor = await requireUser();
  try {
    const data = id
      ? await searches.updateSavedSearch(actor, id, raw)
      : await searches.createSavedSearch(actor, raw);
    revalidatePath("/dashboard/saved-searches");
    return { data };
  } catch (error) {
    return failure(error);
  }
}
export async function deleteSavedSearchAction(id: string): Promise<{ error?: string }> {
  const actor = await requireUser();
  try {
    await searches.deleteSavedSearch(actor, id);
    revalidatePath("/dashboard/saved-searches");
    return {};
  } catch (error) {
    return failure(error);
  }
}
export async function readSavedSearchAlertsAction(
  id?: string,
): Promise<{ error?: string }> {
  const actor = await requireUser();
  try {
    await searches.markSavedSearchRead(actor, id);
    revalidatePath("/dashboard/saved-searches");
    return {};
  } catch (error) {
    return failure(error);
  }
}
