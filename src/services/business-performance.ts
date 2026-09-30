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

export async function recordBusinessView(actor: Actor, raw: unknown) {
  const input = performanceViewInput.parse(raw);
  const day = new Date(new Date().toISOString().slice(0, 10));
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return;
  await withTransaction(async (tx) => {
    const current = await findModerationUser(tx, actor.id);
    if (!current || current.suspendedAt || current.role === "ADMIN") return;
    const business = await records.viewBusiness(tx, input.kind, input.id, actor.id);
    if (!business) return;
    const target = input.kind === "shop" ? "shop" : input.id;
    const visitorHash = createHmac("sha256", secret)
      .update(JSON.stringify([day.toISOString(), business.id, target, actor.id]))
      .digest("hex");
    await records.insertPerformanceView(tx, {
      businessId: business.id,
      target,
      day,
      visitorHash,
    });
  });
}
