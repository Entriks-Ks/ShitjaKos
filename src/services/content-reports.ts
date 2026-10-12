import "server-only";
import type { Actor } from "@/lib/permissions";
import { contentReportInput, reviewContentReportInput } from "@/lib/validations/content-reports";
import { withTransaction } from "@/repositories/transaction";
import { consumeAccountSecurityAttempt } from "@/repositories/users";
import { recordAudit } from "@/repositories/audit";
import * as records from "@/repositories/content-reports";
export class ContentReportError extends Error {}
function assertActive(user: Awaited<ReturnType<typeof records.reportActor>>) {
  if (!user || user.suspendedAt || user.deletedAt || !user.emailVerified) throw new ContentReportError("An active, verified account is required.");
  return user;
}
export async function submitContentReport(actor: Actor, raw: unknown) {
  const parsed = contentReportInput.safeParse(raw);
  if (!parsed.success) throw new ContentReportError(parsed.error.issues[0].message);
  if (!(await consumeAccountSecurityAttempt(actor.id, "content-report"))) throw new ContentReportError("Too many attempts. Please wait a minute.");
  try {
    return await withTransaction(async tx => {
      const user = assertActive(await records.reportActor(tx, actor.id));
      const input = parsed.data;
      const target = await records.reportTarget(tx, input.targetKind, input.targetId, user.id);
      if (!target) throw new ContentReportError("This item is no longer available.");
      if (target.own) throw new ContentReportError("You cannot report your own listing or business.");
      const report = await records.insertReport(tx, { ...input, reporterId: user.id, targetTitle: target.title });
      await recordAudit(tx, user.id, "content-report.created", report.id, { targetKind: input.targetKind, targetId: input.targetId });
      return report.id;
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new ContentReportError("You have already reported this item.");
    throw error;
  }
}
export async function getContentReports(actor: Actor, page: number) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new ContentReportError("Invalid page.");
  return withTransaction(async tx => {
    const user = assertActive(await records.reportActor(tx, actor.id));
    if (user.role !== "ADMIN") throw new ContentReportError("Administrator access required.");
    return records.listReports(tx, page);
  });
}
export async function reviewContentReport(actor: Actor, raw: unknown) {
  const parsed = reviewContentReportInput.safeParse(raw);
  if (!parsed.success) throw new ContentReportError(parsed.error.issues[0].message);
  return withTransaction(async tx => {
    const user = assertActive(await records.reportActor(tx, actor.id));
    if (user.role !== "ADMIN") throw new ContentReportError("Administrator access required.");
    const v = parsed.data;
    const changed = await records.decideReport(tx, v.id, v.expectedStatus, v.status, v.note, user.id);
    if (changed.count !== 1) throw new ContentReportError("This report changed. Reload before reviewing it.");
    await recordAudit(tx, user.id, "content-report.reviewed", v.id, { from: v.expectedStatus, to: v.status, note: v.note });
  });
}
