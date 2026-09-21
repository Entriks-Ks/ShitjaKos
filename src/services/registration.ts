import "server-only";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { getPrisma } from "@/lib/prisma";
import { sendAuthMail } from "@/lib/mail";

const CODE_LIFETIME_MS = 5 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function newCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashCode(registrationId: string, code: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required.");
  return createHmac("sha256", secret).update(`${registrationId}:${code}`).digest("hex");
}

async function mailCode(email: string, code: string) {
  await sendAuthMail(
    email,
    "Your ShitjaKos verification code",
    `Your verification code is: ${code}\n\nEnter this code on the verification page. It expires in 5 minutes.`,
  );
}

export async function startRegistration(name: string, email: string, password: string) {
  const db = getPrisma();
  const normalizedEmail = email.trim().toLowerCase();
  if (
    await db.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } })
  ) {
    return { error: "An account with this email already exists. Sign in or verify it." };
  }

  const existing = await db.pendingRegistration.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_WAIT_MS) {
    return { error: "Please wait a minute before requesting another code." };
  }

  const id = randomUUID();
  const code = newCode();
  const now = new Date();
  const passwordHash = await hashPassword(password);
  await db.pendingRegistration.upsert({
    where: { email: normalizedEmail },
    create: {
      id,
      email: normalizedEmail,
      name,
      passwordHash,
      codeHash: hashCode(id, code),
      expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS),
      lastSentAt: now,
    },
    update: {
      id,
      name,
      passwordHash,
      codeHash: hashCode(id, code),
      expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS),
      lastSentAt: now,
      attempts: 0,
    },
  });

  try {
    await mailCode(normalizedEmail, code);
  } catch {
    await db.pendingRegistration.deleteMany({ where: { id } });
    return { error: "The verification email could not be sent. Please try again." };
  }

  return { registrationId: id };
}

export async function resendRegistrationCode(registrationId: string, email: string) {
  const db = getPrisma();
  const pending = await db.pendingRegistration.findUnique({
    where: { id: registrationId },
  });
  if (!pending || pending.email !== email.trim().toLowerCase()) {
    return { error: "Registration not found. Please create your account again." };
  }
  if (Date.now() - pending.lastSentAt.getTime() < RESEND_WAIT_MS) {
    return { error: "Please wait a minute before requesting another code." };
  }

  const code = newCode();
  const now = new Date();
  await db.pendingRegistration.update({
    where: { id: registrationId },
    data: {
      codeHash: hashCode(registrationId, code),
      expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS),
      lastSentAt: now,
      attempts: 0,
    },
  });
  try {
    await mailCode(pending.email, code);
  } catch {
    return { error: "The verification email could not be sent. Please try again later." };
  }
  return { success: true };
}

export async function finishRegistration(
  registrationId: string,
  email: string,
  code: string,
) {
  const db = getPrisma();
  const pending = await db.pendingRegistration.findUnique({
    where: { id: registrationId },
  });
  if (!pending || pending.email !== email.trim().toLowerCase()) {
    return { error: "Registration not found. Please create your account again." };
  }
  if (pending.expiresAt.getTime() <= Date.now()) {
    return { error: "This code has expired. Request a new one." };
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    return { error: "Too many attempts. Request a new code." };
  }

  const receivedHash = Buffer.from(hashCode(registrationId, code), "hex");
  const storedHash = Buffer.from(pending.codeHash, "hex");
  if (
    receivedHash.length !== storedHash.length ||
    !timingSafeEqual(receivedHash, storedHash)
  ) {
    await db.pendingRegistration.updateMany({
      where: { id: registrationId, attempts: { lt: MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    return { error: "Incorrect code. Please try again." };
  }

  try {
    await db.$transaction(async (tx) => {
      const consumed = await tx.pendingRegistration.deleteMany({
        where: {
          id: registrationId,
          email: pending.email,
          codeHash: pending.codeHash,
          expiresAt: { gt: new Date() },
          attempts: { lt: MAX_ATTEMPTS },
        },
      });
      if (consumed.count !== 1) throw new Error("Registration code was already used.");

      const userId = randomUUID();
      await tx.user.create({
        data: {
          id: userId,
          email: pending.email,
          name: pending.name,
          emailVerified: true,
          accounts: {
            create: {
              id: randomUUID(),
              accountId: userId,
              providerId: "credential",
              password: pending.passwordHash,
            },
          },
          profile: { create: { displayName: pending.name } },
        },
      });
    });
    return { success: true };
  } catch {
    return { error: "Could not create the account. Please try again or sign in." };
  }
}
