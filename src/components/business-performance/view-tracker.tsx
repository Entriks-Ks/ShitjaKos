"use client";
import { useEffect, useTransition } from "react";
import { recordBusinessViewAction } from "@/actions/business-performance";

export function BusinessViewTracker({
  kind,
  id,
}: {
  kind: "shop" | "listing";
  id: string;
}) {
  const [, startTransition] = useTransition();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "visible")
        startTransition(() => recordBusinessViewAction({ kind, id }));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [kind, id]);
  return null;
}
