"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";

import { setFavoriteAction } from "@/actions/favorites";

export function FavoriteButton({
  listingId,
  initialSaved,
  compact = false,
  buttonClassName,
}: {
  listingId: string;
  initialSaved: boolean;
  compact?: boolean;
  buttonClassName?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (pending) return;

    const previous = saved;
    const next = !previous;
    setError("");
    setSaved(next);

    startTransition(async () => {
      try {
        const result = await setFavoriteAction(listingId, next);

        if (result.saved === null) {
          setSaved(previous);
          setError(result.error);
          return;
        }

        setSaved(result.saved);
      } catch {
        setSaved(previous);
        setError("Could not update this favorite. Please try again.");
      }
    });
  }

  return (
    <div className={compact ? "card-favorite-control" : undefined}>
      <button
        type="button"
        className={
          compact
            ? "card-favorite-button"
            : (buttonClassName ?? "btn btn-outline mt-6 w-full")
        }
        aria-pressed={saved}
        aria-busy={pending}
        aria-label={
          compact ? (saved ? "Remove from favorites" : "Save to favorites") : undefined
        }
        title={
          compact ? (saved ? "Remove from favorites" : "Save to favorites") : undefined
        }
        disabled={pending}
        onClick={handleClick}
      >
        <Heart size={18} fill={saved ? "currentColor" : "none"} />
        {!compact && (pending ? "Saving…" : saved ? "Saved" : "Save listing")}
      </button>

      {error && (
        <p className={compact ? "card-favorite-error" : undefined} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
