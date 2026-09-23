import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export type PersonalProfileWrite = Omit<
  Prisma.PersonalProfileUncheckedCreateInput,
  "id" | "userId" | "createdAt" | "updatedAt"
>;

export function findActorById(
  id: string,
  client: Prisma.TransactionClient = getPrisma(),
) {
  return client.user.findUnique({
    where: { id },
    select: { id: true, role: true, suspendedAt: true },
  });
}

export function findUserWithMemberships(
  id: string,
  client: Prisma.TransactionClient = getPrisma(),
) {
  return client.user.findUnique({
    where: { id },
    include: {
      profile: true,
      memberships: { include: { business: { include: { shop: true } } } },
    },
  });
}

export async function createPersonalProfile(
  userId: string,
  displayName: string,
  client: Prisma.TransactionClient = getPrisma(),
) {
  await client.personalProfile.create({ data: { userId, displayName } });
}

export function findUser(tx: Prisma.TransactionClient, id: string) {
  return tx.user.findUniqueOrThrow({ where: { id } });
}

export function findUserWithProfile(tx: Prisma.TransactionClient, id: string) {
  return tx.user.findUniqueOrThrow({ where: { id }, include: { profile: true } });
}

export function findUserStatus(tx: Prisma.TransactionClient, id: string) {
  return tx.user.findUnique({ where: { id }, select: { suspendedAt: true } });
}

export async function renameUser(tx: Prisma.TransactionClient, id: string, name: string) {
  await tx.user.update({ where: { id }, data: { name } });
}

export async function upsertPersonalProfile(
  tx: Prisma.TransactionClient,
  userId: string,
  profile: PersonalProfileWrite,
) {
  await tx.personalProfile.upsert({
    where: { userId },
    create: { userId, ...profile },
    update: profile,
  });
}

export function findUserSuspension(
  id: string,
  client: Prisma.TransactionClient = getPrisma(),
) {
  return client.user.findUnique({
    where: { id },
    select: { suspendedAt: true },
  });
}
