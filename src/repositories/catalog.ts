import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export function findCategoryForListing(tx: Prisma.TransactionClient, id: string) {
  return tx.category.findUnique({
    where: { id },
    include: { attributes: true, children: true },
  });
}

export function getCategories() {
  return getPrisma().category.findMany({
    where: { active: true, ownerPortal: "SHITJAKOS" },
    include: {
      translations: true,
      attributes: { include: { translations: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

export function getAdminCatalog() {
  return getPrisma().category.findMany({
    where: { ownerPortal: "SHITJAKOS" },
    include: {
      translations: true,
      attributes: {
        include: {
          translations: true,
          _count: { select: { values: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { listings: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}
