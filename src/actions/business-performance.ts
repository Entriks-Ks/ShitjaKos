"use server";
import { currentActor } from "@/lib/session";
import { recordBusinessView } from "@/services/business-performance";

export async function recordBusinessViewAction(raw: unknown) {
  const actor = await currentActor();
  if (!actor) return;
  try {
    await recordBusinessView(actor, raw);
  } catch {
    // Analytics must never interrupt browsing or expose visitor information.
    console.error("Business view could not be recorded.");
  }
}
