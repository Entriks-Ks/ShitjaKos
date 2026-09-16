import "server-only";
import { getPrisma } from "@/lib/prisma";

export async function getReviewQueue(reviewerId: string) {
  const [businesses, listings, audits] = await Promise.all([
    getPrisma().business.findMany({
      where: { reviewStatus: "PENDING", memberships: { none: { userId: reviewerId } } },
      orderBy: { createdAt: "asc" },
    }),
    getPrisma().listing.findMany({
      where: {
        status: "PUBLISHED",
        moderationStatus: "PENDING",
        NOT: {
          OR: [
            { personalProfile: { userId: reviewerId } },
            { business: { memberships: { some: { userId: reviewerId } } } },
          ],
        },
      },
      orderBy: { createdAt: "asc" },
      include: {
        business: true,
        personalProfile: true,
        media: { orderBy: { position: "asc" }, take: 1 },
      },
    }),
    getPrisma().auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { actor: { select: { name: true } } },
    }),
  ]);
  return { businesses, listings, audits };
}
