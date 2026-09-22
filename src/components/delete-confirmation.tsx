"use client";

import { useId, useRef, useState } from "react";
import { Trash2, X, LoaderCircle } from "lucide-react";

export function DeleteConfirmation({
  label,
  title,
  description,
  itemName,
  compact = true,
  onConfirm,
  onDeleted,
}: {
  label: string;
  title: string;
  description: string;
  itemName?: string;
  compact?: boolean;
  onConfirm: () => Promise<{ error?: string }>;
  onDeleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();

  async function confirmDelete() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await onConfirm();
      if (result.error) {
        setError(result.error);
        return;
      }
      dialog.current?.close();
      onDeleted();
    } catch {
      setError("Could not complete the deletion. Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "delete-control" : "mt-6"}>
      <button
        type="button"
        className={compact ? "delete-control-button" : "btn btn-outline"}
        aria-label={itemName ? `${label}: ${itemName}` : label}
        aria-haspopup="dialog"
        onClick={() => {
          setError("");
          dialog.current?.showModal();
          cancel.current?.focus();
        }}
      >
        <Trash2 size={14} aria-hidden="true" />
        {label}
      </button>
      <dialog
        ref={dialog}
        className="delete-dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={busy}
        onCancel={(event) => {
          if (pending.current) event.preventDefault();
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
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <h2 id={`${id}-title`}>{title}</h2>
          {itemName && <div className="delete-dialog-item">{itemName}</div>}
          <p id={`${id}-description`} className="delete-dialog-description">
            {description}
          </p>
          {error && (
            <div role="alert" className="notice error">
              {error}
            </div>
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
          <button
            type="button"
            className="btn delete-dialog-confirm"
            disabled={busy}
            onClick={confirmDelete}
          >
            {busy ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 size={16} aria-hidden="true" />
            )}
            {busy ? "Deleting…" : label}
          </button>
        </div>
      </dialog>
    </div>
  );
}
