import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { createPersonalProfile } from "@/repositories/users";
// better-auth's adapter needs the client itself; every other query in this
// file goes through the repository layer.
import { getPrisma } from "./prisma";
import { sendAuthMail } from "./mail";

function makeAuth() {
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
      sendResetPassword: async ({ user, url }) => {
        await sendAuthMail(user.email, "Reset your ShitjaKos password", url);
      },
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
        "/send-verification-email": { window: 60, max: 5 },
        "/email-otp/send-verification-otp": { window: 60, max: 5 },
        "/email-otp/verify-email": { window: 60, max: 8 },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await createPersonalProfile(user.id, user.name);
          },
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 60 * 5,
        allowedAttempts: 5,
        storeOTP: "hashed",
        disableSignUp: true,
        overrideDefaultEmailVerification: true,
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
            `Your verification code is: ${otp}\n\nEnter this code in the app. It expires in 5 minutes.`,
          );
        },
      }),
      nextCookies(),
    ],
  });
}
let auth: ReturnType<typeof makeAuth> | undefined;
export function getAuth() {
  return (auth ??= makeAuth());
}
