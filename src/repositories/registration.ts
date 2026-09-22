import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export type PendingRegistrationWrite = {
  id: string;
  name: string;
  passwordHash: string;
  codeHash: string;
  expiresAt: Date;
  lastSentAt: Date;
};

export function findUserIdByEmail(
  email: string,
  client: Prisma.TransactionClient = getPrisma(),
) {
  return client.user.findUnique({ where: { email }, select: { id: true } });
}

export function findPendingRegistrationByEmail(
  email: string,
  client: Prisma.TransactionClient = getPrisma(),
) {
  return client.pendingRegistration.findUnique({ where: { email } });
}

export function findPendingRegistration(
  id: string,
  client: Prisma.TransactionClient = getPrisma(),
) {
  return client.pendingRegistration.findUnique({ where: { id } });
}

export async function upsertPendingRegistration(
  email: string,
  data: PendingRegistrationWrite,
  client: Prisma.TransactionClient = getPrisma(),
) {
  await client.pendingRegistration.upsert({
    where: { email },
    create: { email, ...data },
    update: { ...data, attempts: 0 },
  });
}

export async function refreshRegistrationCode(
  id: string,
  data: { codeHash: string; expiresAt: Date; lastSentAt: Date },
  client: Prisma.TransactionClient = getPrisma(),
) {
  await client.pendingRegistration.update({
    where: { id },
    data: { ...data, attempts: 0 },
  });
}

export async function deletePendingRegistration(
  id: string,
  client: Prisma.TransactionClient = getPrisma(),
) {
  await client.pendingRegistration.deleteMany({ where: { id } });
}

export async function countFailedAttempt(
  id: string,
  maxAttempts: number,
  client: Prisma.TransactionClient = getPrisma(),
) {
  await client.pendingRegistration.updateMany({
    where: { id, attempts: { lt: maxAttempts } },
    data: { attempts: { increment: 1 } },
  });
}

// Deleting the row is what claims the code, so a count of one is the only
// proof that this caller won the race.
export async function consumePendingRegistration(
  tx: Prisma.TransactionClient,
  input: { id: string; email: string; codeHash: string; maxAttempts: number },
) {
  const consumed = await tx.pendingRegistration.deleteMany({
    where: {
      id: input.id,
      email: input.email,
      codeHash: input.codeHash,
      expiresAt: { gt: new Date() },
      attempts: { lt: input.maxAttempts },
    },
  });
  return consumed.count === 1;
}

export async function createVerifiedUser(
  tx: Prisma.TransactionClient,
  input: { email: string; name: string; passwordHash: string },
) {
  const userId = randomUUID();
  await tx.user.create({
    data: {
      id: userId,
      email: input.email,
      name: input.name,
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: input.passwordHash,
        },
      },
      profile: { create: { displayName: input.name } },
    },
  });
  return userId;
}
