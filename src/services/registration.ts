import "server-only";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { sendAuthMail } from "@/lib/mail";
import { withTransaction } from "@/repositories/transaction";
import {
  consumePendingRegistration,
  countFailedAttempt,
  createVerifiedUser,
  deletePendingRegistration,
  findPendingRegistration,
  findPendingRegistrationByEmail,
  findUserIdByEmail,
  refreshRegistrationCode,
  upsertPendingRegistration,
} from "@/repositories/registration";

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
  const normalizedEmail = email.trim().toLowerCase();
  if (await findUserIdByEmail(normalizedEmail)) {
    return { error: "An account with this email already exists. Sign in or verify it." };
  }

  const existing = await findPendingRegistrationByEmail(normalizedEmail);
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_WAIT_MS) {
    return { error: "Please wait a minute before requesting another code." };
  }

  const id = randomUUID();
  const code = newCode();
  const now = new Date();
  const passwordHash = await hashPassword(password);
  await upsertPendingRegistration(normalizedEmail, {
    id,
    name,
    passwordHash,
    codeHash: hashCode(id, code),
    expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS),
    lastSentAt: now,
  });

  try {
    await mailCode(normalizedEmail, code);
  } catch {
    await deletePendingRegistration(id);
    return { error: "The verification email could not be sent. Please try again." };
  }

  return { registrationId: id };
}

export async function resendRegistrationCode(registrationId: string, email: string) {
  const pending = await findPendingRegistration(registrationId);
  if (!pending || pending.email !== email.trim().toLowerCase()) {
    return { error: "Registration not found. Please create your account again." };
  }
  if (Date.now() - pending.lastSentAt.getTime() < RESEND_WAIT_MS) {
    return { error: "Please wait a minute before requesting another code." };
  }

  const code = newCode();
  const now = new Date();
  await refreshRegistrationCode(registrationId, {
    codeHash: hashCode(registrationId, code),
    expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS),
    lastSentAt: now,
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
  const pending = await findPendingRegistration(registrationId);
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
    await countFailedAttempt(registrationId, MAX_ATTEMPTS);
    return { error: "Incorrect code. Please try again." };
  }

  try {
    await withTransaction(async (tx) => {
      const consumed = await consumePendingRegistration(tx, {
        id: registrationId,
        email: pending.email,
        codeHash: pending.codeHash,
        maxAttempts: MAX_ATTEMPTS,
      });
      if (!consumed) throw new Error("Registration code was already used.");

      await createVerifiedUser(tx, {
        email: pending.email,
        name: pending.name,
        passwordHash: pending.passwordHash,
      });
    });
    return { success: true };
  } catch {
    return { error: "Could not create the account. Please try again or sign in." };
  }
}
