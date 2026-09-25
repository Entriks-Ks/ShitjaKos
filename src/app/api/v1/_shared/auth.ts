import "server-only";
import { z } from "zod";
import * as mobile from "@/lib/mobile-auth";
import { getAuth } from "@/lib/auth";
import { ApiError } from "@/app/api/v1/_shared/input";
import { consumeApiBudget } from "@/app/api/v1/_shared/budget";
import { getV1Auth } from "./mobile-session";
import { startRegistration } from "@/services/registration";

export async function runMobileAuth(action: string, raw: unknown, headers: Headers) {
  const input = z
    .object({
      email: z
        .email()
        .max(254)
        .transform((v) => v.toLowerCase())
        .optional(),
      name: z.string().trim().min(2).max(100).optional(),
      password: z.string().max(128).optional(),
      confirm: z.string().max(128).optional(),
      code: z.string().max(20).optional(),
      otp: z.string().max(20).optional(),
      registrationId: z.string().max(100).optional(),
      registration: z.string().max(100).optional(),
    })
    .parse(raw);
  const allowed = [
    "session",
    "sign-in",
    "sign-up",
    "verify-email",
    "resend-code",
    "forgot-password",
    "reset-password",
    "sign-out",
  ];
  if (!allowed.includes(action)) throw new ApiError(404, "Unknown action.");
  if (!["session", "sign-out"].includes(action)) {
    if (!input.email) throw new ApiError(400, "Email is required.");
    if (
      !(await consumeApiBudget("auth-global", true, 300)) ||
      !(await consumeApiBudget(`auth-email:${input.email}`, true, 8))
    ) {
      throw new ApiError(429, "Too many requests. Try again in a minute.");
    }
  }
  const { email = "", password = "", name = "", confirm = "" } = input;
  const code = input.code ?? input.otp ?? "";
  const registrationId = input.registrationId ?? input.registration ?? "";
  if (["sign-up", "resend-code", "verify-email"].includes(action)) {
    const session = await getV1Auth().api.getSession({ headers });
    const webSession = session ? null : await getAuth().api.getSession({ headers });
    if (session || webSession)
      throw new ApiError(409, "Sign out before registering another account.");
  }
  switch (action) {
    case "session": {
      const session = await getV1Auth().api.getSession({ headers });
      return {
        ok: true,
        session: session
          ? {
              user: {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
              },
            }
          : null,
      };
    }
    case "sign-in":
      return mobile.mobileSignIn(email, password, headers);
    case "sign-up":
      if (!name || password.length < 12)
        throw new ApiError(
          400,
          "A name and a password of at least 12 characters are required.",
        );
      {
        const result = await startRegistration(name, email, password);
        return result.error
          ? { ok: false, error: result.error }
          : { ok: true, email, registrationId: result.registrationId };
      }
    case "verify-email":
      return mobile.mobileVerifyEmail(email, code, registrationId, password, headers);
    case "resend-code":
      return mobile.mobileResendVerificationCode(email, registrationId);
    case "forgot-password":
      return mobile.mobileRequestPasswordReset(email, headers);
    case "reset-password":
      return mobile.mobileResetPassword(email, code, password, confirm, headers);
    case "sign-out":
      await getV1Auth().api.signOut({ headers });
      return { ok: true };
  }
}
