"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { reviewAction } from "@/actions/reviews";

export function ReviewForm({ id, kind }: { id: string; kind: "business" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="review-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        if (!submitter?.value) return;
        const values = new FormData(event.currentTarget);
        values.set("decision", submitter.value);
        setBusy(true);
        setError("");
        try {
          await reviewAction(values);
        } catch {
          setError("Could not save this decision. Refresh the queue and try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <label className="field">
        Review reason
        <input
          aria-label="Review reason"
          name="reason"
          required
          minLength={5}
          maxLength={1000}
          placeholder="Describe what you checked and your decision."
          disabled={busy}
        />
      </label>
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="btn btn-outline"
          name="decision"
          value="REJECTED"
        >
          <X size={15} />
          Reject
        </button>
        <button
          disabled={busy}
          className="btn btn-primary"
          name="decision"
          value="APPROVED"
        >
          <Check size={15} />
          {busy ? "Saving…" : "Approve"}
        </button>
      </div>
      {error && (
        <p role="alert" className="notice error w-full">
          {error}
        </p>
      )}
    </form>
  );
}
