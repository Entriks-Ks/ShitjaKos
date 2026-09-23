"use client";

import { useId, useRef, useState, useTransition } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import styles from "./message-seller.module.css";
import { useRouter } from "next/navigation";
import { startConversationAction } from "@/actions/messaging";

export function MessageSeller({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("Hello, is this still available?");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  const retry = useRef<{ clientId: string; body: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  return (
    <>
      <button
        type="button"
        className="btn btn-outline w-full"
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal();
          input.current?.focus();
        }}
      >
        <MessageCircle size={18} aria-hidden="true" />
        Message seller
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={pending}
        onCancel={(event) => {
          if (locked.current) event.preventDefault();
        }}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <MessageCircle size={24} aria-hidden="true" />
          </span>
          <button
            type="button"
            className={styles.close}
            aria-label="Close message popup"
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id={`${id}-title`}>Message seller</h2>
        <p id={`${id}-description`} className={styles.description}>
          Ask about the listing or arrange a time to see it.
        </p>
        <div className={styles.listing}>{listingTitle}</div>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            if (locked.current) return;
            if (!body.trim()) return;
            locked.current = true;
            setError("");
            const text = body.trim();
            const request =
              retry.current?.body === text
                ? retry.current
                : { body: text, clientId: crypto.randomUUID() };
            retry.current = request;
            startTransition(async () => {
              try {
                const result = await startConversationAction({
                  listingId,
                  ...request,
                });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                dialog.current?.close();
                router.push("/dashboard/messages/" + result.data.conversationId);
              } catch {
                setError(
                  "Connection interrupted. Retry to check whether your message was sent.",
                );
              } finally {
                locked.current = false;
              }
            });
          }}
        >
          <label className="field">
            Your message
            <textarea
              ref={input}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              maxLength={4000}
              rows={3}
              disabled={pending}
            />
          </label>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <div className={styles.footer}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={pending}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending || !body.trim()}
            >
              <Send size={16} aria-hidden="true" />
              {pending ? "Sending…" : "Send message"}
            </button>
          </div>
          <p className="muted text-xs">
            Text messages only. Never share passwords or verification codes.
          </p>
        </form>
      </dialog>
    </>
  );
}
