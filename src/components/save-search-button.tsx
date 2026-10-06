"use client";
import { useId, useRef, useState } from "react";
import Link from "@/components/navigation-link";
import { BookmarkPlus, X } from "lucide-react";
import { saveSearchAction } from "@/actions/saved-searches";
import { filtersFromSearchParams } from "@/lib/validations/saved-searches";

export function SaveSearchButton({
  params,
  signedIn = true,
  suggestedName = "My search",
  existing,
}: {
  params: Record<string, string | undefined>;
  signedIn?: boolean;
  suggestedName?: string;
  existing?: { id: string; name: string; frequency: string };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const id = useId();
  if (!signedIn)
    return (
      <Link href="/login" className="btn btn-outline">
        <BookmarkPlus size={16} />
        Save search
      </Link>
    );
  return (
    <>
      <button
        type="button"
        className="btn btn-outline"
        aria-haspopup="dialog"
        onClick={() => {
          setError("");
          setSaved(false);
          dialog.current?.showModal();
        }}
      >
        <BookmarkPlus size={16} aria-hidden="true" />
        {existing ? "Manage search" : "Save search"}
      </button>
      <dialog
        ref={dialog}
        className="saved-search-dialog"
        aria-labelledby={`${id}-title`}
        aria-busy={busy}
        onCancel={(event) => {
          if (lock.current) event.preventDefault();
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={`${id}-title`} className="text-xl font-semibold">
            {existing ? "Manage saved search" : "Save this search"}
          </h2>
          <button
            type="button"
            className="filter-dialog-close"
            aria-label="Close saved search"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        {saved ? (
          <div className="mt-5 space-y-4">
            <p role="status">Your search has been saved.</p>
            <Link
              href="/dashboard/saved-searches"
              className="btn btn-primary"
              onClick={() => dialog.current?.close()}
            >
              View saved searches
            </Link>
          </div>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (lock.current) return;
              const data = new FormData(event.currentTarget);
              lock.current = true;
              setBusy(true);
              setError("");
              try {
                const payload = {
                  name: String(data.get("name")),
                  frequency: String(data.get("frequency")),
                };
                const result = await saveSearchAction(
                  existing
                    ? payload
                    : { ...payload, filters: filtersFromSearchParams(params) },
                  existing?.id,
                );
                if ("error" in result) setError(result.error);
                else setSaved(true);
              } catch {
                setError("Could not save this search. Please retry.");
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            <p className="text-sm text-stone-600">
              Keep these filters and get account notifications when new listings match.
            </p>
            <fieldset disabled={busy} className="space-y-4">
              <label className="field">
                Search name
                <input
                  name="name"
                  defaultValue={existing?.name ?? suggestedName.slice(0, 80)}
                  maxLength={80}
                  required
                />
              </label>
              <label className="field">
                Alert frequency
                <select name="frequency" defaultValue={existing?.frequency ?? "DAILY"}>
                  <option value="OFF">Off — save filters only</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </label>
              <p className="text-xs text-stone-500">
                Alerts cover new listings from now on. They appear in Saved searches and
                on your account badge. No email is sent.
              </p>
              {error && (
                <p role="alert" className="notice error">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => dialog.current?.close()}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {busy ? "Saving…" : "Save search"}
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </dialog>
    </>
  );
}
