import { apiActor } from "@/app/api/v1/_shared/access";
import { endpoint } from "@/app/api/v1/_shared/http";
import { checkOrigin } from "@/app/api/v1/_shared/input";
import { subscribeToNotifications } from "@/services/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = endpoint(async (request) => {
  checkOrigin(request);
  const actor = await apiActor(request);
  const encoder = new TextEncoder();
  let close = () => {};
  let send: (event: string) => void = () => {};
  const unsubscribe = await subscribeToNotifications(actor, {
    changed: () => send("changed"),
    disconnected: () => close(),
  });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(expiry);
        unsubscribe();
        request.signal.removeEventListener("abort", close);
        try {
          controller.close();
        } catch {
          /* Already cancelled. */
        }
      };
      send = (event) => {
        if (closed) return;
        if ((controller.desiredSize ?? 0) <= 0) {
          close();
          return;
        }
        controller.enqueue(encoder.encode(`event: ${event}\ndata: {}\n\n`));
      };
      // No private message data is sent over this stream. Fetches recheck access.
      controller.enqueue(encoder.encode("retry: 5000\nevent: ready\ndata: {}\n\n"));
      const heartbeat = setInterval(() => send("heartbeat"), 20_000);
      // Reconnect periodically to revalidate the session and recover missed events.
      const expiry = setTimeout(close, 120_000);
      request.signal.addEventListener("abort", close, { once: true });
      if (request.signal.aborted) close();
    },
    cancel() {
      close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "private, no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie, Authorization",
    },
  });
});
