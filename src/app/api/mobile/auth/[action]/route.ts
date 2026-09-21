import { NextResponse } from "next/server";
import {
  mobileCreateAccount,
  mobileGetSession,
  mobileRequestPasswordReset,
  mobileResendVerificationCode,
  mobileResetPassword,
  mobileSignIn,
  mobileSignOut,
  mobileVerifyEmail,
} from "@/lib/mobile-auth";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = new Set([
  process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3001",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const headers = new Headers();
  if (ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Headers", "content-type, origin");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return headers;
}

function json(request: Request, body: unknown, status = 200) {
  const headers = corsHeaders(request);
  headers.set("content-type", "application/json");
  return new NextResponse(JSON.stringify(body), { status, headers });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  let body: Record<string, string> = {};
  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return json(request, { ok: false, error: "Invalid request." }, 400);
  }

  const headers = request.headers;
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");
  const name = String(body.name ?? "");
  const code = String(body.code ?? body.otp ?? "");
  const confirm = String(body.confirm ?? "");
  const registrationId = String(body.registrationId ?? body.registration ?? "");

  try {
    switch (action) {
      case "session":
        return json(request, await mobileGetSession(headers));
      case "sign-in":
        return json(request, await mobileSignIn(email, password, headers));
      case "sign-up":
        return json(request, await mobileCreateAccount(name, email, password));
      case "verify-email":
        return json(
          request,
          await mobileVerifyEmail(email, code, registrationId, password, headers),
        );
      case "resend-code":
        return json(request, await mobileResendVerificationCode(email, registrationId));
      case "forgot-password":
        return json(request, await mobileRequestPasswordReset(email, headers));
      case "reset-password":
        return json(
          request,
          await mobileResetPassword(email, code, password, confirm, headers),
        );
      case "sign-out":
        return json(request, await mobileSignOut(headers));
      default:
        return json(request, { ok: false, error: "Unknown action." }, 404);
    }
  } catch {
    return json(request, { ok: false, error: "Please try again." }, 500);
  }
}
