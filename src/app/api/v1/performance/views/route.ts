import { apiActor } from "@/app/api/v1/_shared/access";
import { endpoint, json } from "@/app/api/v1/_shared/http";
import { readJson, checkOrigin, ApiError } from "@/app/api/v1/_shared/input";
import { recordBusinessView, performanceIntake } from "@/services/business-performance";
import { getAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  createVisitorToken,
  validVisitorToken,
  VISITOR_COOKIE,
  utcDay,
} from "@/lib/performance-visitor";
import { performanceViewInput } from "@/lib/validations/business-performance";

export const runtime = "nodejs";
export const POST = endpoint(async (request) => {
  checkOrigin(request);
  // Respect browser privacy preferences and ignore obvious automated clients.
  if (
    request.headers.get("sec-gpc") === "1" ||
    request.headers.get("dnt") === "1" ||
    /bot|crawler|spider|headless/i.test(request.headers.get("user-agent") ?? "")
  )
    return { ok: true };
  const input = performanceViewInput.parse(await readJson(request));
  if (!(await performanceIntake())) throw new ApiError(429, "Too many view requests.");
  const hasSession =
    request.headers.has("authorization") ||
    Boolean(await getAuth().api.getSession({ headers: request.headers }));
  if (hasSession) {
    // Invalid bearer tokens and suspended accounts never fall back to guests.
    await recordBusinessView(await apiActor(request), input);
    return { ok: true };
  }
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new ApiError(503, "View tracking unavailable.");
  const guest =
    request.headers.get("x-performance-visitor") ??
    new NextRequest(request.url, { headers: request.headers }).cookies.get(VISITOR_COOKIE)
      ?.value;
  if (!validVisitorToken(guest, secret)) {
    const token = createVisitorToken(secret);
    const response = new NextResponse(
      JSON.stringify({ ok: true, retry: true, visitorToken: token }),
      { status: 202, headers: json({}).headers },
    );
    const expires = new Date(utcDay().getTime() + 86400000);
    response.cookies.set(VISITOR_COOKIE, token, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/api/v1/performance",
      expires,
    });
    // A new token alone does not count: the client must return it once.
    return response;
  }
  await recordBusinessView(null, input, guest);
  return { ok: true };
});
