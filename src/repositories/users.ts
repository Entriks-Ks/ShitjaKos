import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";

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

export async function consumeAccountSecurityAttempt(userId: string, operation: string) {
  const key = `account-security:${userId}:${operation}`;
  const now = BigInt(Date.now());
  const cutoff = now - BigInt(60_000);

  const rows = await getPrisma().$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimit" (
      "id",
      "key",
      "count",
      "lastRequest"
    )
    VALUES (
      ${randomUUID()},
      ${key},
      1,
      ${now}
    )
    ON CONFLICT ("key")
    DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."lastRequest" <= ${cutoff}
          THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "lastRequest" = CASE
        WHEN "RateLimit"."lastRequest" <= ${cutoff}
          THEN ${now}
        ELSE "RateLimit"."lastRequest"
      END
    RETURNING "count"
  `;

  return rows[0].count <= 5;
}

export function findDeletionCredential(userId: string) {
  return getPrisma().account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true, password: true },
  });
}

export async function lockAccountForDeletion(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "userId" = ${userId} FOR UPDATE`;
  return tx.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      accounts: {
        where: { providerId: "credential" },
        select: { id: true, password: true },
      },
      memberships: { where: { role: "OWNER" }, select: { businessId: true } },
    },
  });
}

export async function anonymizeAccount(
  tx: Prisma.TransactionClient,
  userId: string,
  email: string,
) {
  const now = new Date();
  // Retain closed listing records and message history; remove contact details.
  await tx.listing.updateMany({
    where: { personalProfile: { userId } },
    data: {
      status: "CLOSED",
      phoneVisible: false,
      contactPhone: null,
      version: { increment: 1 },
    },
  });
  await tx.personalProfile.updateMany({
    where: { userId },
    data: { displayName: "Deleted account", phone: "", bio: "", city: "" },
  });
  await tx.conversation.updateMany({
    where: { sellerUserId: userId, sellerKind: "PERSONAL" },
    data: { sellerName: "Deleted account" },
  });
  await tx.savedSearch.deleteMany({ where: { userId } });
  await tx.favorite.deleteMany({ where: { userId } });
  await tx.businessMembership.deleteMany({ where: { userId } });
  await tx.businessStaffInvitation.deleteMany({
    where: {
      OR: [{ email: { equals: email, mode: "insensitive" } }, { invitedById: userId }],
    },
  });
  await tx.pendingRegistration.deleteMany({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  await tx.verification.deleteMany({
    where: {
      OR: [
        { identifier: { startsWith: "reset-password:" }, value: userId },
        {
          identifier: {
            in: ["email-verification", "sign-in", "forget-password"].map(
              (type) => `${type}-otp-${email.toLowerCase()}`,
            ),
          },
        },
        { identifier: { startsWith: `change-email-otp-${email.toLowerCase()}-` } },
      ],
    },
  });
  await tx.session.deleteMany({ where: { userId } });
  await tx.account.deleteMany({ where: { userId } });
  await tx.user.update({
    where: { id: userId },
    data: {
      name: "Deleted account",
      email: `deleted-${randomUUID()}@account.invalid`,
      emailVerified: false,
      image: null,
      suspendedAt: now,
      deletedAt: now,
    },
  });
}
