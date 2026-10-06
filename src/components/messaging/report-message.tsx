"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Flag, MoreHorizontal, X } from "lucide-react";
import { reportMessageAction } from "@/actions/messaging";
import styles from "./report-message.module.css";

const reasons = [
  "Spam or unwanted advertising",
  "Scam or suspicious activity",
  "Harassment or abusive content",
  "Other concern",
];

export function ReportMessage({
  conversationId,
  messageId,
  body,
}: {
  conversationId: string;
  messageId: string;
  body: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const options = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const lock = useRef(false);
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (submitted) cancel.current?.focus();
  }, [submitted]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !options.current?.contains(event.target))
        setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [menuOpen]);

  return (
    <>
      <div
        ref={options}
        className={styles.options}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMenuOpen(false);
            trigger.current?.focus();
            event.stopPropagation();
          }
        }}
      >
        <button
          ref={trigger}
          type="button"
          className={styles.trigger}
          aria-label="Message options"
          aria-expanded={menuOpen}
          aria-controls={`${id}-options`}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
        {menuOpen && (
          <div id={`${id}-options`} className={styles.menu}>
            <button
              type="button"
              className={styles.menuItem}
              aria-haspopup="dialog"
              onClick={() => {
                setMenuOpen(false);
                setError("");
                dialog.current?.showModal();
                cancel.current?.focus();
              }}
            >
              <Flag size={15} aria-hidden="true" /> Report
            </button>
          </div>
        )}
      </div>
      <dialog
        ref={dialog}
        onClose={() => trigger.current?.focus()}
        className={styles.dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={pending}
        onCancel={(event) => {
          if (lock.current) event.preventDefault();
        }}
      >
        <div className={styles.heading}>
          <span className={styles.icon}>
            {submitted ? <CheckCircle2 size={23} /> : <Flag size={23} />}
          </span>
          <button
            type="button"
            className={styles.close}
            aria-label="Close report popup"
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id={`${id}-title`}>{submitted ? "Report submitted" : "Report message"}</h2>
        <p id={`${id}-description`} className={styles.description}>
          {submitted
            ? "Your report has been recorded for review. Thank you for letting us know."
            : "Tell us what concerns you about this message. Reporting does not automatically remove it."}
        </p>
        {submitted ? (
          <div className={styles.footer} role="status">
            <button
              ref={cancel}
              type="button"
              className="btn btn-primary"
              onClick={() => dialog.current?.close()}
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (lock.current) return;
              const form = event.currentTarget;
              const data = new FormData(form);
              const selected = String(data.get("reason") ?? "");
              if (!reasons.includes(selected)) {
                setError("Choose a reason.");
                return;
              }
              const details = String(data.get("details") ?? "").trim();
              lock.current = true;
              setPending(true);
              setError("");
              try {
                const result = await reportMessageAction({
                  conversationId,
                  messageId,
                  reason: details ? `${selected}: ${details}` : selected,
                });
                if (result.ok) {
                  setSubmitted(true);
                  form.reset();
                } else setError(result.error);
              } catch {
                setError("Could not submit your report. Please try again.");
              } finally {
                lock.current = false;
                setPending(false);
              }
            }}
          >
            <blockquote className={styles.preview}>
              <span>Selected message</span>
              <p>{body}</p>
            </blockquote>
            <fieldset disabled={pending} className={styles.fields}>
              <label htmlFor={`${id}-reason`}>
                Reason
                <select id={`${id}-reason`} name="reason" defaultValue="" required>
                  <option value="" disabled>
                    Choose a reason
                  </option>
                  {reasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor={`${id}-details`}>
                Additional details <span className={styles.optional}>(optional)</span>
                <textarea
                  id={`${id}-details`}
                  name="details"
                  rows={3}
                  maxLength={900}
                  placeholder="Anything else that would help us review this message"
                />
              </label>
            </fieldset>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className={styles.footer}>
              <button
                ref={cancel}
                type="button"
                className="btn btn-outline"
                disabled={pending}
                onClick={() => dialog.current?.close()}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={pending}>
                {pending ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
