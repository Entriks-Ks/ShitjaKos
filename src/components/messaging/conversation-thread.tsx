"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "@/components/navigation-link";
import type { ChatMessage, ChatView } from "@/types/messaging";
import {
  sendMessageAction,
  markReadAction,
  blockConversationAction,
  reportMessageAction,
} from "@/actions/messaging";

function mergeMessages(previous: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(previous.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort((a, b) => a.sequence - b.sequence);
}

function ReportMessage({
  conversationId,
  messageId,
}: {
  conversationId: string;
  messageId: string;
}) {
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const locked = useRef(false);
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer">Report message</summary>
      <form
        className="mt-2 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (locked.current) return;
          locked.current = true;
          const reason = String(new FormData(event.currentTarget).get("reason") ?? "");
          startTransition(async () => {
            try {
              const result = await reportMessageAction({
                conversationId,
                messageId,
                reason,
              });
              setNotice(result.ok ? "Report recorded." : result.error);
            } catch {
              setNotice("Could not submit report. Please retry.");
            } finally {
              locked.current = false;
            }
          });
        }}
      >
        <label className="field">
          Reason
          <textarea
            name="reason"
            required
            minLength={5}
            maxLength={1000}
            rows={2}
            disabled={pending}
          />
        </label>
        <button className="btn btn-outline" disabled={pending}>
          Submit report
        </button>
        {notice && <p role="status">{notice}</p>}
      </form>
    </details>
  );
}

export function ConversationThread({ initial }: { initial: ChatView }) {
  const [view, setView] = useState(initial);
  const [messages, setMessages] = useState(initial.messages);
  const [fetchedThrough, setFetchedThrough] = useState(
    initial.messages.at(-1)?.sequence ?? 0,
  );
  const [older, setOlder] = useState(initial.hasMore);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [fatal, setFatal] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [request, setRequest] = useState<{
    body: string;
    clientId: string;
    failed: boolean;
  } | null>(null);
  const [sending, startSend] = useTransition();
  const [blocking, startBlock] = useTransition();
  const [endVisible, setEndVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const latest = useRef(initial.messages.at(-1)?.sequence ?? 0);
  const atBottom = useRef(true);
  const lastRead = useRef(0);
  const sendLock = useRef(false);
  const blockLock = useRef(false);

  const accept = useCallback((next: ChatView) => {
    if (next.messages.length) {
      latest.current = Math.max(latest.current, next.messages.at(-1)!.sequence);
      setFetchedThrough(latest.current);
    }
    setView(next);
    setMessages((previous) => mergeMessages(previous, next.messages));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    async function poll() {
      try {
        if (document.visibilityState !== "visible") return;
        const response = await fetch(
          "/api/v1/conversations/" + initial.id + "/messages?after=" + latest.current,
          { cache: "no-store", signal: controller.signal },
        );
        if ([401, 403, 404].includes(response.status)) {
          stopped = true;
          setFatal(true);
          setMessages([]);
          setRequest(null);
          setError("This conversation is no longer available to your account.");
          return;
        }
        if (!response.ok) throw new Error("poll");
        const next: ChatView = await response.json();
        if (!controller.signal.aborted) accept(next);
      } catch {
        if (!controller.signal.aborted)
          setError("Connection interrupted. Retrying updates shortly.");
      } finally {
        if (!stopped && !controller.signal.aborted) timer = setTimeout(poll, 5000);
      }
    }
    timer = setTimeout(poll, 5000);
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [initial.id, accept]);

  useEffect(() => {
    function update() {
      setFocused(document.visibilityState === "visible" && document.hasFocus());
    }
    update();
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setEndVisible(entry.isIntersecting),
      { threshold: 1 },
    );
    if (end.current) observer.observe(end.current);
    return () => observer.disconnect();
  }, []);

  const newest = messages.at(-1)?.sequence ?? 0;
  const readThrough = Math.min(newest, fetchedThrough);
  useEffect(() => {
    if (atBottom.current && container.current)
      container.current.scrollTop = container.current.scrollHeight;
  }, [newest, request]);

  const [, startRead] = useTransition();
  useEffect(() => {
    if (
      fatal ||
      !focused ||
      !endVisible ||
      !readThrough ||
      readThrough <= lastRead.current
    )
      return;
    let cancelled = false;
    const timer = setTimeout(() => {
      startRead(async () => {
        try {
          const result = await markReadAction({
            conversationId: initial.id,
            sequence: readThrough,
          });
          if (result.ok && !cancelled)
            lastRead.current = Math.max(lastRead.current, readThrough);
        } catch {
          /* Read state can be retried on the next visible update. */
        }
      });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [initial.id, readThrough, focused, endVisible, fatal, startRead]);

  function send() {
    if (sendLock.current || fatal || !view.canSend) return;
    const draft = request ?? {
      body: body.trim(),
      clientId: crypto.randomUUID(),
      failed: false,
    };
    if (!draft.body) return;
    sendLock.current = true;
    setRequest({ ...draft, failed: false });
    setError("");
    startSend(async () => {
      try {
        const result = await sendMessageAction({
          conversationId: initial.id,
          body: draft.body,
          clientId: draft.clientId,
        });
        if (!result.ok) throw new Error(result.error);
        // Do not advance the polling cursor here: another user's message may
        // have been committed before this reply but not fetched by this client.
        setMessages((previous) => mergeMessages(previous, [result.data]));
        setBody("");
        setRequest(null);
      } catch (error) {
        setRequest({ ...draft, failed: true });
        setError(
          error instanceof Error
            ? error.message
            : "Could not send. Retry the same message.",
        );
      } finally {
        sendLock.current = false;
      }
    });
  }

  if (fatal)
    return (
      <p role="alert" className="notice error">
        {error} <Link href="/dashboard/messages">Back to inbox</Link>
      </p>
    );

  return (
    <section className="workspace-card space-y-4">
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <Link href="/dashboard/messages" className="text-sm">
            ← Messages
          </Link>
          <h1 className="mt-2">{view.otherName}</h1>
          <p className="muted">{view.title}</p>
          {view.listingId ? (
            <Link className="text-sm" href={"/listings/" + view.listingId}>
              View listing
            </Link>
          ) : (
            <p className="muted">Listing removed. Conversation history retained.</p>
          )}
        </div>
        <button
          className="btn btn-outline"
          disabled={blocking}
          onClick={() => {
            if (blockLock.current) return;
            blockLock.current = true;
            startBlock(async () => {
              try {
                const result = await blockConversationAction({
                  conversationId: initial.id,
                  blocked: !view.blockedByMe,
                });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                const response = await fetch(
                  "/api/v1/conversations/" +
                    initial.id +
                    "/messages?after=" +
                    latest.current,
                  { cache: "no-store" },
                );
                if (!response.ok) throw new Error("refresh");
                accept(await response.json());
              } catch {
                setError("Could not refresh the conversation. Updates will retry.");
              } finally {
                blockLock.current = false;
              }
            });
          }}
        >
          {view.blockedByMe ? "Unblock conversation" : "Block conversation"}
        </button>
      </header>

      <div
        ref={container}
        className="h-[50vh] min-h-64 overflow-y-auto space-y-4 rounded-xl bg-stone-50 p-4"
        onScroll={() => {
          const node = container.current!;
          atBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 50;
        }}
      >
        {older && (
          <button
            className="btn btn-outline"
            disabled={loadingOlder}
            onClick={async () => {
              setLoadingOlder(true);
              atBottom.current = false;
              try {
                const response = await fetch(
                  "/api/v1/conversations/" +
                    initial.id +
                    "/messages?before=" +
                    messages[0].sequence,
                  { cache: "no-store" },
                );
                if (!response.ok) throw new Error("older");
                const next: ChatView = await response.json();
                setMessages((previous) => mergeMessages(previous, next.messages));
                setOlder(next.hasMore);
              } catch {
                setError("Could not load older messages.");
              } finally {
                setLoadingOlder(false);
              }
            }}
          >
            Load older messages
          </button>
        )}
        {messages.map((message) => (
          <article
            key={message.id}
            className={
              "max-w-[90%] rounded-2xl p-3 " +
              (message.mine
                ? "ml-auto bg-emerald-100"
                : "bg-white border border-stone-200")
            }
          >
            <p className="text-xs font-medium mb-1">
              {message.mine ? "You" : message.side === "SELLER" ? "Seller" : "Buyer"}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
            <time className="muted text-xs" dateTime={message.createdAt}>
              {message.createdAt.slice(0, 16).replace("T", " ")} UTC
            </time>
            {message.side !== view.side && (
              <ReportMessage conversationId={initial.id} messageId={message.id} />
            )}
          </article>
        ))}
        {request &&
          !messages.some(
            (message) => message.mine && message.clientId === request.clientId,
          ) && (
            <article className="ml-auto max-w-[90%] rounded-2xl bg-emerald-50 p-3 opacity-75">
              <p className="whitespace-pre-wrap break-words text-sm">{request.body}</p>
              <p role="status" className="text-xs">
                {request.failed ? "Not confirmed — retry below" : "Sending…"}
              </p>
            </article>
          )}
        <div ref={end} className="h-1" />
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {!view.canSend && (
        <p className="notice">
          Sending is unavailable because this conversation is blocked or an account/shop
          is unavailable.
        </p>
      )}
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <div className="flex flex-wrap gap-2" aria-label="Quick replies">
          {["Is this still available?", "When can I collect it?", "Thank you!"].map(
            (text) => (
              <button
                key={text}
                type="button"
                className="btn btn-outline"
                disabled={!!request || !view.canSend}
                onClick={() => setBody(text)}
              >
                {text}
              </button>
            ),
          )}
        </div>
        <label className="field">
          Your message
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            required
            maxLength={4000}
            disabled={!!request || !view.canSend}
          />
        </label>
        <div className="flex gap-3">
          <button
            className="btn btn-primary"
            disabled={sending || !view.canSend || (!request && !body.trim())}
          >
            {sending ? "Sending…" : request?.failed ? "Retry message" : "Send"}
          </button>
          {request?.failed && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setRequest(null)}
            >
              Edit draft
            </button>
          )}
        </div>
        <p className="muted text-xs">
          Text only. Do not send passwords, verification codes, or payment credentials.
        </p>
      </form>
    </section>
  );
}
