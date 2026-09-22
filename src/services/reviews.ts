import "server-only";
import { Actor, isStaff } from "@/lib/permissions";
import { recordAudit } from "@/repositories/audit";
import { withTransaction } from "@/repositories/transaction";
import {
  findBusinessWithMemberships,
  setBusinessReviewStatus,
} from "@/repositories/businesses";

export async function reviewItem(
  actor: Actor,
  input: {
    id: string;
    kind: "business";
    decision: "APPROVED" | "REJECTED";
    reason: string;
  },
) {
  if (!isStaff(actor)) throw new Error("Not authorized.");

  if (input.kind !== "business") throw new Error("Only businesses require review.");

  await withTransaction(async (tx) => {
    const business = await findBusinessWithMemberships(tx, input.id);
    if (business.memberships.some((membership) => membership.userId === actor.id)) {
      throw new Error("You cannot review your own business.");
    }
    await setBusinessReviewStatus(tx, input.id, input.decision);
    await recordAudit(tx, actor.id, `${input.kind}.reviewed`, input.id, {
      decision: input.decision,
      reason: input.reason,
    });
  });
}
