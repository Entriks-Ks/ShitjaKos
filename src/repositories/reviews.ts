import "server-only";
import { getPrisma } from "@/lib/prisma";

export async function getReviewQueue(reviewerId: string) {
  const [businesses, audits] = await Promise.all([
    getPrisma().business.findMany({
      where: { reviewStatus: "PENDING", memberships: { none: { userId: reviewerId } } },
      orderBy: { createdAt: "asc" },
    }),
    getPrisma().auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { actor: { select: { name: true } } },
    }),
  ]);
  return { businesses, audits };
}
