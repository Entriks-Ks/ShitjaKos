import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import {
  finishRegistration,
  resendRegistrationCode,
  startRegistration,
} from "@/services/registration";
import { getPrisma } from "./prisma";
import { sendAuthMail } from "./mail";
import { suspensionSessionHooks } from "@/lib/suspension-hooks";

function makeMobileAuth() {
  if (!process.env.BETTER_AUTH_SECRET)
    throw new Error("BETTER_AUTH_SECRET is required. Run npm run setup:local.");
  return betterAuth({
    appName: "ShitjaKos",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(getPrisma(), { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
    },
    trustedOrigins: [
      process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "http://localhost:8081",
      "http://127.0.0.1:8081",
    ],
    advanced: {
      cookiePrefix: "shitjakos-mobile",
    },
    emailVerification: {
      sendOnSignUp: false,
      autoSignInAfterVerification: true,
    },
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/sign-up/email": { window: 60, max: 5 },
        "/email-otp/send-verification-otp": { window: 60, max: 5 },
        "/email-otp/verify-email": { window: 60, max: 8 },
        "/email-otp/request-password-reset": { window: 60, max: 5 },
        "/email-otp/reset-password": { window: 60, max: 8 },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await getPrisma().personalProfile.create({
              data: { userId: user.id, displayName: user.name },
            });
          },
        },
      },
      session: suspensionSessionHooks,
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 60 * 30,
        allowedAttempts: 5,
        storeOTP: "hashed",
        disableSignUp: true,
        sendVerificationOnSignUp: false,
        async sendVerificationOTP({ email, otp, type }) {
          const subject =
            type === "forget-password"
              ? "Your ShitjaKos password reset code"
              : type === "sign-in"
                ? "Your ShitjaKos sign-in code"
                : "Your ShitjaKos verification code";
          await sendAuthMail(
            email,
            subject,
            `Your verification code is: ${otp}\n\nKodi i verifikimit: ${otp}\n\nEnter this code in the app. It expires in 30 minutes.`,
          );
        },
      }),
      nextCookies(),
    ],
  });
}

let mobileAuth: ReturnType<typeof makeMobileAuth> | undefined;
export function getMobileAuth() {
  return (mobileAuth ??= makeMobileAuth());
}

export type MobileAuthResult = {
  ok: boolean;
  error?: string;
  signedIn?: boolean;
  email?: string;
  notice?: string;
  token?: string;
  registrationId?: string;
  session?: { user: { id: string; name: string; email: string } } | null;
};

function sessionToken(data: unknown) {
  if (data && typeof data === "object" && "token" in data) {
    const token = (data as { token?: unknown }).token;
    if (typeof token === "string" && token) return token;
  }
  return undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function errorStatus(error: unknown) {
  if (error && typeof error === "object" && "statusCode" in error) {
    return Number((error as { statusCode: unknown }).statusCode);
  }
  if (error && typeof error === "object" && "status" in error) {
    return Number((error as { status: unknown }).status);
  }
  return 500;
}

function errorMessage(error: unknown, fallback = "Please try again.") {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function mobileGetSession(headers: HeadersInit): Promise<MobileAuthResult> {
  const data = await getMobileAuth().api.getSession({ headers });
  if (!data?.user) {
    return { ok: true, session: null };
  }
  return {
    ok: true,
    session: {
      user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
      },
    },
  };
}

export async function mobileSignIn(
  email: string,
  password: string,
  headers: HeadersInit,
): Promise<MobileAuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const pending = await getPrisma().pendingRegistration.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (pending) {
    return {
      ok: false,
      error:
        "This email is not registered yet. Open Create an account and enter the verification code first.",
    };
  }
  try {
    const data = await getMobileAuth().api.signInEmail({
      body: { email: normalizedEmail, password, rememberMe: true },
      headers,
    });
    return { ok: true, signedIn: true, token: sessionToken(data) };
  } catch (error) {
    const status = errorStatus(error);
    if (status === 403) {
      return {
        ok: false,
        error:
          "This email is not verified yet. Open Create an account, resend the code, and enter it there.",
      };
    }
    if (status === 401) {
      return {
        ok: false,
        error:
          "Invalid email or password. New emails must Create an account first, then enter the code from your inbox.",
      };
    }
    return { ok: false, error: errorMessage(error) };
  }
}

export async function mobileCreateAccount(
  name: string,
  email: string,
  password: string,
): Promise<MobileAuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return { ok: false, error: "Enter your name." };
  }
  if (password.length < 12) {
    return { ok: false, error: "Password must be at least 12 characters." };
  }

  const db = getPrisma();
  try {
    const leftover = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
    });
    if (leftover && !leftover.emailVerified) {
      await db.session.deleteMany({ where: { userId: leftover.id } });
      await db.account.deleteMany({ where: { userId: leftover.id } });
      await db.personalProfile.deleteMany({ where: { userId: leftover.id } });
      await db.user.delete({ where: { id: leftover.id } }).catch(() => undefined);
    }
  } catch {
    // Old unverified rows must not block sending a new code.
  }

  const existingPending = await db.pendingRegistration.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  let result: { error?: string; registrationId?: string } = {};
  try {
    result = await startRegistration(trimmedName, normalizedEmail, password);
  } catch {
    result = {};
  }
  const registrationId =
    result.registrationId ??
    existingPending?.id ??
    (
      await db.pendingRegistration.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      })
    )?.id;
  if (registrationId) {
    return {
      ok: true,
      email: normalizedEmail,
      registrationId,
      notice: `We sent a 6-digit code to ${normalizedEmail}. Check inbox and spam.`,
    };
  }

  return { ok: false, error: result.error ?? "Please try again." };
}

export async function mobileVerifyEmail(
  email: string,
  code: string,
  registrationId: string,
  password: string,
  headers: HeadersInit,
): Promise<MobileAuthResult> {
  const otp = code.replace(/\s/g, "");
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { ok: false, error: "Create an account first." };
  }
  if (!/^\d{6}$/.test(otp)) {
    return { ok: false, error: "Enter the 6-digit code from your email." };
  }

  const pending =
    (registrationId.trim()
      ? await getPrisma().pendingRegistration.findUnique({
          where: { id: registrationId.trim() },
        })
      : null) ??
    (await getPrisma().pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    }));

  if (!pending) {
    const existing = await getPrisma().user.findUnique({
      where: { email: normalizedEmail },
      select: { emailVerified: true },
    });
    if (existing?.emailVerified) {
      return signInAfterVerify(normalizedEmail, password, headers);
    }
    return { ok: false, error: "Create an account first." };
  }

  const result = await finishRegistration(pending.id, normalizedEmail, otp);
  if (result.error) {
    const existing = await getPrisma().user.findUnique({
      where: { email: normalizedEmail },
      select: { emailVerified: true },
    });
    if (existing?.emailVerified) {
      return signInAfterVerify(normalizedEmail, password, headers);
    }
    return { ok: false, error: result.error };
  }

  return signInAfterVerify(normalizedEmail, password, headers);
}

async function signInAfterVerify(
  email: string,
  password: string,
  headers: HeadersInit,
): Promise<MobileAuthResult> {
  if (password.length >= 12) {
    try {
      const data = await getMobileAuth().api.signInEmail({
        body: { email, password, rememberMe: true },
        headers,
      });
      return { ok: true, signedIn: true, token: sessionToken(data) };
    } catch {
      return {
        ok: true,
        email,
        notice: "Account created. You can now sign in.",
      };
    }
  }

  return {
    ok: true,
    email,
    notice: "Account created. You can now sign in.",
  };
}

export async function mobileResendVerificationCode(
  email: string,
  registrationId: string,
): Promise<MobileAuthResult> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !registrationId.trim()) {
    return { ok: false, error: "Enter your email address first." };
  }

  const result = await resendRegistrationCode(registrationId.trim(), normalizedEmail);
  if (result.error) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    email: normalizedEmail,
    registrationId: registrationId.trim(),
    notice: `A new code was sent to ${normalizedEmail}. Check inbox and spam.`,
  };
}

export async function mobileRequestPasswordReset(
  email: string,
  headers: HeadersInit,
): Promise<MobileAuthResult> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { ok: false, error: "Enter your email address first." };
  }

  try {
    await getMobileAuth().api.requestPasswordResetEmailOTP({
      body: { email: normalizedEmail },
      headers,
    });
    return { ok: true, email: normalizedEmail };
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, "Could not send the code. Please try again."),
    };
  }
}

export async function mobileResetPassword(
  email: string,
  code: string,
  password: string,
  confirm: string,
  headers: HeadersInit,
): Promise<MobileAuthResult> {
  const otp = code.replace(/\s/g, "");
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { ok: false, error: "Missing email. Start from Forgot password." };
  }
  if (!/^\d{6}$/.test(otp)) {
    return { ok: false, error: "Enter the 6-digit code from your email." };
  }
  if (password.length < 12) {
    return { ok: false, error: "Password must be at least 12 characters." };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords do not match." };
  }

  try {
    await getMobileAuth().api.resetPasswordEmailOTP({
      body: {
        email: normalizedEmail,
        otp,
        password,
      },
      headers,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Invalid or expired code.") };
  }
}

export async function mobileSignOut(headers: HeadersInit): Promise<MobileAuthResult> {
  try {
    await getMobileAuth().api.signOut({ headers });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
