"use server";
import { currentActor } from "@/lib/session";
import { recordBusinessView, performanceIntake } from "@/services/business-performance";

export async function recordBusinessViewAction(raw: unknown) {
  const actor = await currentActor();
  if (!actor) return;
  try {
    if (!(await performanceIntake())) return;
    await recordBusinessView(actor, raw);
  } catch {
    // Analytics must never interrupt browsing or expose visitor information.
    console.error("Business view could not be recorded.");
  }
}
