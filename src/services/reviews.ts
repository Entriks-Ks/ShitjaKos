import "server-only";
import { getPrisma } from "@/lib/prisma";
import { Actor, isStaff } from "@/lib/permissions";

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

  await getPrisma().$transaction(async (tx) => {
    if (input.kind === "business") {
      const business = await tx.business.findUniqueOrThrow({
        where: { id: input.id },
        include: { memberships: true },
      });
      if (business.memberships.some((membership) => membership.userId === actor.id)) {
        throw new Error("You cannot review your own business.");
      }
      await tx.business.update({
        where: { id: input.id },
        data: { reviewStatus: input.decision, reviewedAt: new Date() },
      });
    }

    await tx.auditEvent.create({
      data: {
        actorId: actor.id,
        action: `${input.kind}.reviewed`,
        targetId: input.id,
        detail: { decision: input.decision, reason: input.reason },
      },
    });
  });
}
