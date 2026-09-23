"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startConversationAction } from "@/actions/messaging";

export function MessageSeller({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("Hello, is this still available?");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  const retry = useRef<{ clientId: string; body: string } | null>(null);

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (locked.current) return;
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
        Message seller
        <textarea
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
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={pending || !body.trim()}
      >
        {pending ? "Sending…" : "Send message"}
      </button>
      <p className="muted text-xs">
        Text messages only. Never share passwords or verification codes.
      </p>
    </form>
  );
}
