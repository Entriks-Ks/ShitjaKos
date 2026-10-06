"use client";

import { useId, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { deleteAccountAction } from "@/app/(account)/dashboard/profile/actions";
import { authClient } from "@/lib/auth-client";

export function DeleteAccount() {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();

  return (
    <div className="security-row">
      <div>
        <Trash2 size={19} aria-hidden="true" />
        <span>
          <strong>Delete account</strong>
          <small>Permanently remove your account access and profile details.</small>
        </span>
      </div>
      <button
        type="button"
        className="btn btn-outline"
        aria-haspopup="dialog"
        onClick={() => {
          setError("");
          dialog.current?.showModal();
          cancel.current?.focus();
        }}
      >
        Delete account
      </button>
      <dialog
        ref={dialog}
        className="delete-dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={busy}
        onCancel={(event) => {
          if (locked.current) event.preventDefault();
        }}
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (locked.current) return;
            const form = event.currentTarget;
            const data = new FormData(form);
            locked.current = true;
            setBusy(true);
            setError("");
            try {
              const result = await deleteAccountAction({
                password: String(data.get("password") ?? ""),
                confirmation: String(data.get("confirmation") ?? ""),
              });
              if (result.error) {
                setError(result.error);
                return;
              }
              form.reset();
              // Sessions are already revoked in the deletion transaction.
              // Best-effort cookie cleanup must not turn a successful deletion into an error.
              try {
                await authClient.signOut();
              } catch {}
              window.location.replace("/login?accountDeleted=1");
            } catch {
              setError(
                "Could not confirm deletion. Check your connection and try again.",
              );
            } finally {
              locked.current = false;
              setBusy(false);
            }
          }}
        >
          <div className="delete-dialog-body">
            <div className="delete-dialog-heading">
              <span className="delete-dialog-icon">
                <Trash2 size={23} aria-hidden="true" />
              </span>
              <button
                type="button"
                className="filter-dialog-close"
                aria-label="Close confirmation"
                disabled={busy}
                onClick={() => dialog.current?.close()}
              >
                <X size={18} />
              </button>
            </div>
            <h2 id={`${id}-title`}>Delete your account?</h2>
            <div
              id={`${id}-description`}
              className="my-4 space-y-3 text-sm text-stone-600"
            >
              <p>
                This cannot be undone. Your profile details and login credentials will be
                removed, and all sessions signed out.
              </p>
              <p>
                Your personal listings will be closed and hidden. Existing messages remain
                available to other participants under �Deleted account�. Closed listing
                records, images and audit records are retained.
              </p>
              <p>
                Your staff memberships will be removed. If you own a shop, delete it or
                arrange an ownership transfer first.
              </p>
            </div>
            <fieldset disabled={busy} className="space-y-4">
              <label className="field">
                Current password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
              </label>
              <label className="field">
                Type DELETE to confirm
                <input
                  name="confirmation"
                  autoComplete="off"
                  spellCheck={false}
                  pattern="DELETE"
                  required
                />
              </label>
            </fieldset>
            {error && (
              <p role="alert" className="notice error">
                {error}
              </p>
            )}
          </div>
          <div className="delete-dialog-footer">
            <button
              ref={cancel}
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" className="btn delete-dialog-confirm" disabled={busy}>
              {busy ? "Deleting�" : "Permanently delete account"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
