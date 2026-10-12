import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { publicWhere } from "@/repositories/listings";
type Tx = Prisma.TransactionClient;
export async function reportActor(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${id} FOR SHARE`;
  return tx.user.findUnique({ where: { id } });
}
export async function reportTarget(tx: Tx, kind: "LISTING" | "BUSINESS", id: string, userId: string) {
  if (kind === "LISTING") {
    const item = await tx.listing.findFirst({ where: { ...publicWhere(), id }, include: {
      personalProfile: true, business: { include: { memberships: true } },
    }});
    return item ? { title: item.title, own: item.personalProfile?.userId === userId || !!item.business?.memberships.some(m => m.userId === userId) } : null;
  }
  const item = await tx.business.findFirst({ where: { id, reviewStatus: "APPROVED", suspendedAt: null, shop: { isNot: null } }, include: { memberships: true } });
  return item ? { title: item.publicName, own: item.memberships.some(m => m.userId === userId) } : null;
}
export function insertReport(tx: Tx, data: Prisma.ContentReportUncheckedCreateInput) {
  return tx.contentReport.create({ data });
}
export function listReports(tx: Tx, page: number) {
  return tx.contentReport.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 21 });
}
export function decideReport(tx: Tx, id: string, expectedStatus: string, status: string, note: string, actorId: string) {
  return tx.contentReport.updateMany({ where: { id, status: expectedStatus }, data: {
    status, decisionNote: note, reviewedById: actorId, reviewedAt: new Date(),
  }});
}
