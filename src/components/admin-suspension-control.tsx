"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { changeAccountSuspensionAction } from "@/actions/admin-accounts";

export function AdminSuspensionControl({
    kind,
    id,
    name,
    suspended,
    protectedAccount = false,
}: {
    kind: "user" | "business";
    id: string;
    name: string;
    suspended: boolean;
    protectedAccount?: boolean;
}) {
    const router = useRouter();
    const dialog = useRef<HTMLDialogElement>(null);
    const pending = useRef(false);
    const titleId = useId();

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const label = suspended ? "Restore" : "Suspend";

    if (protectedAccount) {
        return <span className="muted text-sm">Protected admin</span>;
    }

    return (
        <>
            <button
                type="button"
                className="btn btn-outline"
                aria-haspopup="dialog"
                onClick={() => {
                    setError("");
                    dialog.current?.showModal();
                }}
            >
                {label}
            </button>

            <dialog
                ref={dialog}
                className="delete-dialog"
                aria-labelledby={titleId}
                aria-busy={busy}
                onCancel={(event) => {
                    if (pending.current) event.preventDefault();
                }}
            >
                <form
                    onSubmit={async (event) => {
                        event.preventDefault();

                        if (pending.current) return;

                        const form = event.currentTarget;
                        const values = new FormData(form);

                        pending.current = true;
                        setBusy(true);
                        setError("");

                        try {
                            const result = await changeAccountSuspensionAction({
                                kind,
                                id,
                                suspended: !suspended,
                                reason: String(values.get("reason") ?? ""),
                            });

                            if (result.error) {
                                setError(result.error);
                                return;
                            }

                            form.reset();
                            dialog.current?.close();
                            router.refresh();
                        } catch {
                            setError("Could not update this account. Please try again.");
                        } finally {
                            pending.current = false;
                            setBusy(false);
                        }
                    }}
                >
                    <div className="delete-dialog-body">
                        <h2 id={titleId}>
                            {label} {kind === "user" ? "user" : "business"}?
                        </h2>

                        <div className="delete-dialog-item">{name}</div>

                        <p className="delete-dialog-description">
                            {suspended
                                ? "This removes the suspension. Existing approval and listing statuses will still apply."
                                : kind === "user"
                                    ? "This signs the user out and hides their personal listings."
                                    : "This hides the shop and its business listings from the marketplace."}
                        </p>

                        <label className="field mt-5">
                            Reason
                            <textarea
                                name="reason"
                                required
                                minLength={5}
                                maxLength={1000}
                                rows={3}
                                disabled={busy}
                                placeholder="Explain this decision for the audit history."
                            />
                        </label>

                        {error && (
                            <div role="alert" className="notice error">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="delete-dialog-footer">
                        <button
                            type="button"
                            className="btn btn-outline"
                            disabled={busy}
                            onClick={() => dialog.current?.close()}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className={
                                suspended
                                    ? "btn btn-primary"
                                    : "btn delete-dialog-confirm"
                            }
                            disabled={busy}
                        >
                            {busy ? "Saving…" : label}
                        </button>
                    </div>
                </form>
            </dialog>
        </>
    );
}