"use client";

import { startTransition, useRef, useState } from "react";
import { Archive, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import {
  categoryStatusAction,
  deleteCategoryAction,
  deleteFieldAction,
} from "@/app/(admin)/admin/catalog/actions";

function MenuError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="catalog-action-error" role="alert">
      {message}
    </p>
  );
}

export function CategoryActions({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function finish() {
    setConfirming(false);
    menu.current?.removeAttribute("open");
  }

  function changeStatus() {
    setBusy(true);
    setError("");
    startTransition(async () => {
      try {
        const result = await categoryStatusAction(id, !active);
        if (result.error) setError(result.error);
        else finish();
      } catch {
        setError("Could not update this category.");
      } finally {
        setBusy(false);
      }
    });
  }

  function remove() {
    setBusy(true);
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteCategoryAction(id);
        if (result.error) setError(result.error);
        else finish();
      } catch {
        setError("Could not delete this category.");
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <details
      className="catalog-action-menu"
      name="catalog-actions"
      ref={menu}
      onToggle={(event) => {
        if (!event.currentTarget.open) {
          setConfirming(false);
          setError("");
        }
      }}
    >
      <summary aria-label={`Actions for ${name}`} title="Manage">
        <MoreHorizontal size={18} />
      </summary>
      <div className="catalog-action-popover">
        {!confirming ? (
          <>
            <button type="button" disabled={busy} onClick={changeStatus}>
              {active ? <Archive size={15} /> : <RotateCcw size={15} />}
              {active ? "Archive" : "Restore"}
            </button>
            <button
              type="button"
              className="danger"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={15} /> Delete permanently
            </button>
            <p className="catalog-action-hint">
              Delete works only when no listings or subcategories depend on this item.
            </p>
          </>
        ) : (
          <div className="catalog-delete-confirm">
            <strong>Delete “{name}”?</strong>
            <p>This permanent action is allowed only for unused catalog items.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" disabled={busy} onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button type="button" className="danger" disabled={busy} onClick={remove}>
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
        <MenuError message={error} />
      </div>
    </details>
  );
}

export function FieldDeleteAction({
  id,
  name,
  hasValues,
}: {
  id: string;
  name: string;
  hasValues: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function remove() {
    setBusy(true);
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteFieldAction(id);
        if (result.error) setError(result.error);
        else {
          menu.current?.removeAttribute("open");
        }
      } catch {
        setError("Could not delete this field.");
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <details
      className="catalog-action-menu field-menu"
      name="catalog-actions"
      ref={menu}
      onToggle={(event) => {
        if (!event.currentTarget.open) {
          setConfirming(false);
          setError("");
        }
      }}
    >
      <summary aria-label={`Actions for field ${name}`} title="Field actions">
        <MoreHorizontal size={16} />
      </summary>
      <div className="catalog-action-popover">
        {hasValues ? (
          <p className="catalog-action-hint">
            This field is in use and cannot be deleted because listings have saved
            answers.
          </p>
        ) : !confirming ? (
          <button type="button" className="danger" onClick={() => setConfirming(true)}>
            <Trash2 size={15} /> Delete field
          </button>
        ) : (
          <div className="catalog-delete-confirm">
            <strong>Delete “{name}”?</strong>
            <div className="flex gap-2 justify-end mt-3">
              <button type="button" disabled={busy} onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button type="button" className="danger" disabled={busy} onClick={remove}>
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
        <MenuError message={error} />
      </div>
    </details>
  );
}
