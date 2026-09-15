import "server-only";
import { getPrisma } from "@/lib/prisma";
import { Actor, isStaff } from "@/lib/permissions";

export async function reviewItem(
  actor: Actor,
  input: {
    id: string;
    kind: "listing" | "business";
    decision: "APPROVED" | "REJECTED";
    reason: string;
  },
) {
  if (!isStaff(actor)) throw new Error("Not authorized.");

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
    } else {
      const listing = await tx.listing.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          personalProfile: true,
          business: { include: { memberships: true } },
        },
      });
      if (
        listing.personalProfile?.userId === actor.id ||
        listing.business?.memberships.some((membership) => membership.userId === actor.id)
      ) {
        throw new Error("You cannot review your own listing.");
      }
      await tx.listing.update({
        where: { id: input.id },
        data: { moderationStatus: input.decision, version: { increment: 1 } },
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
