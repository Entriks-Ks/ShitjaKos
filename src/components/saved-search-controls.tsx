"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteConfirmation } from "@/components/delete-confirmation";
import {
  deleteSavedSearchAction,
  readSavedSearchAlertsAction,
} from "@/actions/saved-searches";
import {
  refreshMessageNotifications,
  useMessageNotifications,
} from "@/hooks/use-message-notifications";

export function DeleteSavedSearch({ id, name }: { id: string; name: string }) {
  return (
    <DeleteConfirmation
      label="Delete"
      title="Delete saved search?"
      itemName={name}
      description="This removes the saved filters and their notifications. Listings are not affected."
      onConfirm={() => deleteSavedSearchAction(id)}
      onDeleted={refreshMessageNotifications}
    />
  );
}
export function ReadSearchAlerts({ id }: { id?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        className="btn btn-outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await readSavedSearchAlertsAction(id);
            if (result.error) setError(result.error);
            else refreshMessageNotifications();
          } catch {
            setError("Could not mark alerts as read.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : id ? "Mark read" : "Mark all read"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function SavedSearchLiveUpdates() {
  const router = useRouter();
  const { savedSearchUnread, latestSavedSearch } = useMessageNotifications();
  const previous = useRef<string | null>(null);
  const revision = `${savedSearchUnread}:${latestSavedSearch?.id ?? ""}`;
  useEffect(() => {
    if (previous.current !== null && previous.current !== revision) router.refresh();
    previous.current = revision;
  }, [revision, router]);
  return null;
}
