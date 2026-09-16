"use client";

import { createPortal } from "react-dom";

export function NavigationProgress({ pending }: { pending: boolean }) {
  if (!pending) return null;

  // A portal keeps the bar outside cards with clipping or transformed parents.
  return createPortal(
    <div className="navigation-progress" role="status" aria-label="Loading page">
      <span className="navigation-progress-bar" aria-hidden="true" />
      <span className="sr-only">Loading page…</span>
    </div>,
    document.body,
  );
}
