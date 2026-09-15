import "server-only";
import { getPrisma } from "@/lib/prisma";

export function getOwnedListings(userId: string) {
  return getPrisma().listing.findMany({
    where: {
      OR: [
        { personalProfile: { userId } },
        { business: { memberships: { some: { userId } } } },
      ],
    },
    include: { business: true, media: { select: { id: true } } },
    orderBy: { updatedAt: "desc" },
  });
}
