"use client";
import { useEffect } from "react";

export function BusinessViewTracker({
  kind,
  id,
}: {
  kind: "shop" | "listing";
  id: string;
}) {
  useEffect(() => {
    if (
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
    )
      return;
    const controller = new AbortController();
    let sent = false;
    let timer: number | undefined;
    async function send() {
      if (sent || document.visibilityState !== "visible") return;
      sent = true;
      const options = {
        method: "POST",
        credentials: "same-origin" as const,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
        signal: controller.signal,
      };
      try {
        const response = await fetch("/api/v1/performance/views", options);
        if (response.status === 202 && !controller.signal.aborted) {
          // One retry only. Cookie-disabled browsers are not counted.
          await fetch("/api/v1/performance/views", options);
        }
      } catch {
        /* Tracking never interrupts browsing. */
      }
    }
    function visible() {
      window.clearTimeout(timer);
      if (!sent && document.visibilityState === "visible")
        timer = window.setTimeout(send, 1500);
    }
    visible();
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", visible);
    };
  }, [kind, id]);
  return null;
}
