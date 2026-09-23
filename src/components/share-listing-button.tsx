"use client";

import { useRef, useState } from "react";
import { Share2 } from "lucide-react";

export function ShareListingButton({ title }: { title: string }) {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  async function share() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setNotice("");
    setManualUrl("");
    const url = new URL(window.location.href);
    url.hash = "";
    const link = url.toString();
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title, url: link });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(link);
      setNotice("Link copied!");
    } catch {
      setManualUrl(link);
      setNotice("Copy the link below to share this listing.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-outline w-full"
        disabled={busy}
        onClick={share}
      >
        <Share2 size={18} aria-hidden="true" />
        Share listing
      </button>
      {notice && (
        <p role="status" className="muted text-xs mt-2">
          {notice}
        </p>
      )}
      {manualUrl && (
        <input
          aria-label="Listing link to copy"
          className="w-full mt-2 text-sm"
          readOnly
          value={manualUrl}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </div>
  );
}
