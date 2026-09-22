import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export function countListingMedia(tx: Prisma.TransactionClient, listingId: string) {
  return tx.listingMedia.count({ where: { listingId } });
}

export function createListingMedia(
  tx: Prisma.TransactionClient,
  input: { listingId: string; storageKey: string; altText: string; position: number },
) {
  return tx.listingMedia.create({ data: input });
}

export async function deleteListingMedia(tx: Prisma.TransactionClient, id: string) {
  await tx.listingMedia.delete({ where: { id } });
}

export async function setListingMediaPosition(
  tx: Prisma.TransactionClient,
  id: string,
  position: number,
) {
  await tx.listingMedia.update({ where: { id }, data: { position } });
}
