"use client";

import {
    useId,
    useRef,
    useState,
} from "react";
import { useRouter } from "next/navigation";

import { reviewMessageReportAction } from "@/actions/admin-message-reports";

type Decision =
    | "RESOLVED"
    | "DISMISSED";

export function AdminMessageReportControl({
    reportId,
    messagePreview,
}: {
    reportId: string;
    messagePreview: string;
}) {
    const router = useRouter();
    const dialog = useRef<HTMLDialogElement>(null);
    const pending = useRef(false);
    const titleId = useId();

    const [decision, setDecision] =
        useState<Decision>("RESOLVED");

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    function openDialog(value: Decision) {
        setDecision(value);
        setError("");
        dialog.current?.showModal();
    }

    return (
        <>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                        openDialog("RESOLVED")
                    }
                >
                    Resolve
                </button>

                <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                        openDialog("DISMISSED")
                    }
                >
                    Dismiss
                </button>
            </div>

            <dialog
                ref={dialog}
                className="delete-dialog"
                aria-labelledby={titleId}
                aria-busy={busy}
                onCancel={(event) => {
                    if (pending.current) {
                        event.preventDefault();
                    }
                }}
            >
                <form
                    onSubmit={async (event) => {
                        event.preventDefault();

                        if (pending.current) {
                            return;
                        }

                        const form = event.currentTarget;
                        const values = new FormData(form);

                        pending.current = true;
                        setBusy(true);
                        setError("");

                        try {
                            const result =
                                await reviewMessageReportAction({
                                    reportId,
                                    decision,
                                    note: String(
                                        values.get("note") ?? "",
                                    ),
                                });

                            if (!result.ok) {
                                setError(result.error);
                                return;
                            }

                            form.reset();
                            dialog.current?.close();
                            router.refresh();
                        } catch {
                            setError(
                                "Could not review this report. Please try again.",
                            );
                        } finally {
                            pending.current = false;
                            setBusy(false);
                        }
                    }}
                >
                    <div className="delete-dialog-body">
                        <h2 id={titleId}>
                            {decision === "RESOLVED"
                                ? "Resolve report?"
                                : "Dismiss report?"}
                        </h2>

                        <div className="delete-dialog-item">
                            {messagePreview}
                        </div>

                        <p className="delete-dialog-description">
                            {decision === "RESOLVED"
                                ? "Confirm that moderation action was required."
                                : "Confirm that this report does not require further action."}
                        </p>

                        <label className="field mt-5">
                            Decision note

                            <textarea
                                name="note"
                                required
                                minLength={5}
                                maxLength={1000}
                                rows={4}
                                disabled={busy}
                                placeholder="Explain why this decision was made."
                            />
                        </label>

                        {error && (
                            <div
                                role="alert"
                                className="notice error"
                            >
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="delete-dialog-footer">
                        <button
                            type="button"
                            className="btn btn-outline"
                            disabled={busy}
                            onClick={() =>
                                dialog.current?.close()
                            }
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className={
                                decision === "RESOLVED"
                                    ? "btn btn-primary"
                                    : "btn delete-dialog-confirm"
                            }
                            disabled={busy}
                        >
                            {busy
                                ? "Saving…"
                                : decision === "RESOLVED"
                                    ? "Resolve report"
                                    : "Dismiss report"}
                        </button>
                    </div>
                </form>
            </dialog>
        </>
    );
}
