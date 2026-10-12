"use server";
import { revalidatePath } from "next/cache";
import { currentActor } from "@/lib/session";
import { ContentReportError, submitContentReport, reviewContentReport } from "@/services/content-reports";
async function execute(raw: unknown, review: boolean) {
  const actor = await currentActor();
  if (!actor) return { ok: false, error: "Please sign in first." };
  try {
    if (review) await reviewContentReport(actor, raw);
    else await submitContentReport(actor, raw);
    revalidatePath("/admin/content-reports");
    return { ok: true, error: "" };
  } catch (error) {
    if (!(error instanceof ContentReportError)) console.error("Report operation failed.", error instanceof Error ? error.name : "UnknownError");
    return { ok: false, error: error instanceof ContentReportError ? error.message : "Could not complete the request. Please retry." };
  }
}
export async function submitContentReportAction(raw: unknown) { return execute(raw, false); }
export async function reviewContentReportAction(raw: unknown) { return execute(raw, true); }
