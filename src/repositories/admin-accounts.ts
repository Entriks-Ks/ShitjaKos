import "server-only";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const ADMIN_PAGE_SIZE = 20;

export async function findAdminUsers(query: string, page: number) {
  const where: Prisma.UserWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};
  const db = getPrisma();

  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        suspendedAt: true,
        memberships: {
          select: {
            role: true,
            business: {
              select: { id: true, publicName: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    db.user.count({ where }),
  ]);

  return { items, total };
}

export async function findAdminBusinesses(query: string, page: number) {
  const where: Prisma.BusinessWhereInput = query
    ? {
        OR: [
          { publicName: { contains: query, mode: "insensitive" } },
          { legalName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const db = getPrisma();

  const [items, total] = await Promise.all([
    db.business.findMany({
      where,
      select: {
        id: true,
        publicName: true,
        legalName: true,
        email: true,
        reviewStatus: true,
        suspendedAt: true,
        memberships: {
          where: { role: "OWNER" },
          select: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    db.business.count({ where }),
  ]);

  return { items, total };
}

export function findModerationUser(tx: Prisma.TransactionClient, id: string) {
  return tx.user.findUnique({
    where: { id },
    select: { id: true, role: true, suspendedAt: true },
  });
}

export function findModerationBusiness(tx: Prisma.TransactionClient, id: string) {
  return tx.business.findUnique({
    where: { id },
    select: {
      id: true,
      suspendedAt: true,
    },
  });
}

export async function updateUserSuspension(
  tx: Prisma.TransactionClient,
  id: string,
  suspended: boolean,
) {
  await tx.user.update({
    where: { id },
    data: {
      suspendedAt: suspended ? new Date() : null,
    },
  });

  if (suspended) {
    await tx.session.deleteMany({
      where: { userId: id },
    });
  }
}

export function updateBusinessSuspension(
  tx: Prisma.TransactionClient,
  id: string,
  suspended: boolean,
) {
  return tx.business.update({
    where: { id },
    data: {
      suspendedAt: suspended ? new Date() : null,
    },
  });
}
