import "server-only";
import { createHmac } from "node:crypto";
import type { Actor } from "@/lib/permissions";
import {
  performanceRange,
  performanceViewInput,
} from "@/lib/validations/business-performance";
import { withTransaction } from "@/repositories/transaction";
import { findModerationUser } from "@/repositories/admin-accounts";
import * as records from "@/repositories/business-performance";
import { performanceHash, utcDay, validVisitorToken } from "@/lib/performance-visitor";

export class PerformanceError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 = 403,
  ) {
    super(message);
  }
}

export async function getBusinessPerformance(
  actor: Actor,
  businessId: string,
  raw: unknown,
) {
  let range: ReturnType<typeof performanceRange>;
  try {
    range = performanceRange(raw);
  } catch {
    throw new PerformanceError(
      "Choose valid dates, up to 366 days, ending today or earlier.",
      400,
    );
  }
  return withTransaction(async (tx) => {
    const owner = await records.performanceOwner(tx, businessId, actor.id);
    if (!owner)
      throw new PerformanceError(
        "Performance is only available to the active business owner.",
      );
    return {
      name: owner.business.publicName,
      from: range.from.toISOString().slice(0, 10),
      to: range.to.toISOString().slice(0, 10),
      ...(await records.performanceTotals(tx, businessId, range.from, range.until)),
    };
  });
}

export async function recordBusinessView(
  actor: Actor | null,
  raw: unknown,
  guestToken?: string,
) {
  const input = performanceViewInput.parse(raw);
  const day = utcDay();
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return;
  if (!actor && !validVisitorToken(guestToken, secret)) return;
  await withTransaction(async (tx) => {
    if (actor) {
      const current = await findModerationUser(tx, actor.id);
      if (!current || current.suspendedAt || current.role === "ADMIN") return;
    }
    const identity = actor ? `user:${actor.id}` : `guest:${guestToken}`;
    const budget = performanceHash(`${day.toISOString()}:${identity}`, secret);
    if (!(await records.consumePerformanceBudget(tx, `visitor:${budget}`, 30))) return;
    const business = await records.viewBusiness(
      tx,
      input.kind,
      input.id,
      actor?.id ?? null,
    );
    if (!business) return;
    const target = input.kind === "shop" ? "shop" : input.id;
    const visitorHash = createHmac("sha256", secret)
      // Preserve existing signed-in hashes during the migration day.
      .update(
        JSON.stringify([day.toISOString(), business.id, target, actor?.id ?? identity]),
      )
      .digest("hex");
    await records.insertPerformanceView(tx, {
      businessId: business.id,
      target,
      day,
      visitorHash,
    });
  });
}

export async function performanceIntake() {
  return withTransaction(async (tx) => {
    if (await records.consumePerformanceBudget(tx, "maintenance", 1))
      await records.cleanupPerformance(tx);
    return records.consumePerformanceBudget(tx, "intake", 600);
  });
}

export async function maintainPerformance() {
  return withTransaction((tx) => records.cleanupPerformance(tx));
}
