import "server-only";
import type { Prisma } from "@/generated/prisma/client";

export async function recordAudit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  targetId: string,
  detail: Prisma.InputJsonValue,
) {
  await tx.auditEvent.create({ data: { actorId, action, targetId, detail } });
}
