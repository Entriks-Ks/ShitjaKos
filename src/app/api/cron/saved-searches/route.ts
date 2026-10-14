import { timingSafeEqual } from "node:crypto";
import {
  processSavedSearchAlerts,
  processSavedSearchEmails,
} from "@/services/saved-searches";

export const runtime = "nodejs";
export const maxDuration = 120;

// Called by a scheduler, never by browser navigation. No secret in URL parameters.
export async function POST(request: Request) {
  const secret = process.env.SAVED_SEARCH_CRON_SECRET;
  if (!secret || secret.length < 32)
    return Response.json({ error: "Scheduler not configured." }, { status: 503 });
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected))
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  try {
    // Bounded work per HTTP call. More due work remains for the next invocation.
    const matching = await processSavedSearchAlerts(10, Date.now() + 20_000);
    const emails = await processSavedSearchEmails(2);
    return Response.json(
      { ...matching, ...emails },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Saved-search processing failed. Retry later." },
      { status: 500 },
    );
  }
}
