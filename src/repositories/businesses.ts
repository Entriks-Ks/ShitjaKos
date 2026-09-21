import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export function getBusinessDeletionContext(
  tx: Prisma.TransactionClient,
  businessId: string,
  userId: string,
) {
  return tx.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    include: {
      user: true,
      business: { include: { _count: { select: { listings: true } } } },
    },
  });
}

export async function removeEmptyBusiness(tx: Prisma.TransactionClient, id: string) {
  await tx.shop.deleteMany({ where: { businessId: id } });
  await tx.businessMembership.deleteMany({ where: { businessId: id } });
  // The listing foreign key restricts deletion if a listing was added concurrently.
  await tx.business.delete({ where: { id } });
}
