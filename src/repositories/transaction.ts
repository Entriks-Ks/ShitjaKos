import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

// Services own the transaction boundary but must not reach for the client
// itself; this keeps every Prisma import inside the repository layer.
export function withTransaction<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return getPrisma().$transaction(run);
}
