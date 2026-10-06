"use client";

import Image from "next/image";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  MoreHorizontal,
  Send,
  Package,
  Check,
} from "lucide-react";
import styles from "./messaging.module.css";
import Link from "@/components/navigation-link";
import type { ChatMessage, ChatView } from "@/types/messaging";
import {
  sendMessageAction,
  markReadAction,
  blockConversationAction,
} from "@/actions/messaging";
import {
  subscribeChatUpdates,
  isNotificationStreamConnected,
  registerMessageNotificationReader,
} from "@/hooks/use-message-notifications";
import { ReportMessage } from "./report-message";
import { DeleteConversationButton } from "./delete-conversation-button";

function mergeMessages(previous: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(previous.map((message) => [message.id, message]));
  incoming.forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort((a, b) => a.sequence - b.sequence);
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
  const [failedListingPhotoId, setFailedListingPhotoId] = useState<string | null>(null);
  const [request, setRequest] = useState<{
    body: string;
    clientId: string;
    failed: boolean;
  } | null>(null);
  const [sending, startSend] = useTransition();
  const [blocking, startBlock] = useTransition();
  const [followingLatest, setFollowingLatest] = useState(true);
  const [visible, setVisible] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(initial.messages.at(-1)?.sequence ?? 0);
  const atBottom = useRef(true);
  const lastRead = useRef(0);
  const readInFlight = useRef<Promise<void> | null>(null);
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

  const acknowledge = useCallback(
    async (sequence: number) => {
      // Both visibility changes and incoming messages can ask to acknowledge.
      // Serialize them so a slow Server Action is not sent twice.
      while (sequence > lastRead.current) {
        if (readInFlight.current) {
          await readInFlight.current;
          continue;
        }
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const task = (async () => {
          const result = await Promise.race([
            markReadAction({ conversationId: initial.id, sequence }),
            new Promise<never>((_, reject) => {
              timeout = setTimeout(
                () => reject(new Error("Read acknowledgement timed out.")),
                30_000,
              );
            }),
          ]);
          if (!result.ok) throw new Error(result.error);
          lastRead.current = Math.max(lastRead.current, sequence);
        })();
        readInFlight.current = task;
        try {
          await task;
        } finally {
          clearTimeout(timeout);
          if (readInFlight.current === task) readInFlight.current = null;
        }
      }
    },
    [initial.id],
  );

  useEffect(() => {
    let stopped = false;
    let running = false;
    let queued = false;
    let retryNeeded = false;
    let retryDelay = 1_000;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function readingNewest() {
      return document.visibilityState === "visible" && atBottom.current;
    }

    function schedule(delay = 150) {
      // Throttle bursts without indefinitely postponing updates.
      if (stopped || timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        void refresh();
      }, delay);
    }

    function requestRefresh() {
      if (stopped) return;
      if (running) {
        queued = true;
        return;
      }
      schedule();
    }

    async function refresh() {
      if (stopped || running || document.visibilityState !== "visible") {
        return;
      }
      running = true;
      queued = false;
      const currentController = new AbortController();
      controller = currentController;
      const timeout = setTimeout(() => currentController.abort(), 15_000);
      try {
        const response = await fetch(
          "/api/v1/conversations/" + initial.id + "/messages?after=" + latest.current,
          { cache: "no-store", signal: currentController.signal },
        );
        if (stopped) return;
        if ([401, 403, 404].includes(response.status)) {
          stopped = true;
          setFatal(true);
          setMessages([]);
          setRequest(null);
          setError("This conversation is no longer available to your account.");
          return;
        }
        if (!response.ok) throw new Error("refresh");
        const next: ChatView = await response.json();
        if (stopped || currentController.signal.aborted) return;
        const previousSequence = latest.current;
        accept(next);
        // Acknowledge only fetched messages while the recipient is actually
        // viewing the newest messages. Do this before publishing the badge.
        if (readingNewest() && latest.current > lastRead.current) {
          await acknowledge(latest.current);
        }
        retryNeeded = false;
        retryDelay = 1_000;
        setError((current) =>
          current === "Connection interrupted. Retrying updates shortly." ? "" : current,
        );
        // Drain all missed pages after reconnecting; never advance using a sent reply alone.
        if (next.hasMore && latest.current > previousSequence) queued = true;
      } catch {
        if (!stopped) {
          retryNeeded = true;
          setError("Connection interrupted. Retrying updates shortly.");
        }
      } finally {
        clearTimeout(timeout);
        if (controller === currentController) controller = undefined;
        running = false;
        if (!stopped && queued) {
          queued = false;
          schedule();
        } else {
          if (!stopped && retryNeeded) {
            // Retry temporary failures promptly, then back off. A lost SSE
            // event must not strand the chat until the next one-minute check.
            schedule(retryDelay);
            retryDelay = Math.min(retryDelay * 2, 60_000);
          }
        }
      }
    }

    const unsubscribe = subscribeChatUpdates(requestRefresh);
    function handleVisibility() {
      if (document.visibilityState === "visible") requestRefresh();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", requestRefresh);
    window.addEventListener("focus", requestRefresh);
    const fallbackTimer = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        (!isNotificationStreamConnected() || retryNeeded)
      )
        requestRefresh();
    }, 60_000);
    requestRefresh();
    return () => {
      stopped = true;
      unsubscribe();
      controller?.abort();
      clearTimeout(timer);
      clearInterval(fallbackTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", requestRefresh);
      window.removeEventListener("focus", requestRefresh);
    };
  }, [initial.id, accept, acknowledge]);

  useEffect(() => {
    function update() {
      // A visible conversation is being read even when the composer or browser
      // window is not focused (for example, two windows beside each other).
      setVisible(document.visibilityState === "visible");
    }
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    if (!fatal && visible && followingLatest)
      return registerMessageNotificationReader(initial.id);
  }, [initial.id, fatal, visible, followingLatest]);

  const newest = messages.at(-1)?.sequence ?? 0;
  const readThrough = Math.min(newest, fetchedThrough);
  useLayoutEffect(() => {
    if (atBottom.current && container.current)
      container.current.scrollTop = container.current.scrollHeight;
  }, [newest, request]);

  useEffect(() => {
    if (
      fatal ||
      !visible ||
      !followingLatest ||
      !readThrough ||
      readThrough <= lastRead.current
    )
      return;
    void acknowledge(readThrough).catch(() => {
      /* A failed acknowledgement leaves the messages unread; the next update retries. */
    });
  }, [readThrough, visible, followingLatest, fatal, acknowledge]);

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
        // Do not advance the message cursor here: another user's message may
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
    <section className={styles.thread} aria-label="Conversation">
      <header className={styles.chatHeader}>
        <Link
          href="/dashboard/messages"
          className={styles.iconButton}
          aria-label="Back to messages"
        >
          <ArrowLeft size={20} />
        </Link>
        <span className={styles.avatar} aria-hidden="true">
          {view.otherName.trim().slice(0, 2).toUpperCase() || "?"}
        </span>
        <div className={styles.identity}>
          <h1>{view.otherName}</h1>
          <p>
            {view.side === "BUYER"
              ? "Your conversation with the seller"
              : "Your conversation with the buyer"}
          </p>
        </div>
        <details className={styles.options}>
          <summary className={styles.iconButton} aria-label="Conversation options">
            <MoreHorizontal size={22} />
          </summary>

          <div className={styles.optionsMenu}>
            <button
              type="button"
              className={styles.optionsMenuButton}
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
                      `/api/v1/conversations/${initial.id}/messages?after=${latest.current}`,
                      {
                        cache: "no-store",
                      },
                    );

                    if (!response.ok) {
                      throw new Error("refresh");
                    }

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

            <DeleteConversationButton
              conversationId={initial.id}
              otherName={view.otherName}
            />
          </div>
        </details>
      </header>
      <div className={styles.listingBar}>
        <span className={styles.listingThumbnail} aria-hidden="true">
          <Package size={22} />
          {view.listingPhoto && failedListingPhotoId !== view.listingPhoto.id && (
            <Image
              unoptimized
              src={`/api/media/${view.listingPhoto.id}?size=thumb`}
              alt=""
              fill
              sizes="52px"
              onError={() => setFailedListingPhotoId(view.listingPhoto?.id ?? null)}
            />
          )}
        </span>
        <div>
          <span>About this listing</span>
          <strong>{view.title}</strong>
        </div>
        {view.listingId ? (
          <Link href={"/listings/" + view.listingId}>
            View listing <ArrowUpRight size={16} />
          </Link>
        ) : (
          <span>Listing removed</span>
        )}
      </div>

      <div
        ref={container}
        className={styles.messages}
        role="region"
        aria-label="Message history"
        tabIndex={0}
        onScroll={() => {
          const node = container.current!;
          atBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 50;
          setFollowingLatest(atBottom.current);
        }}
      >
        {older && (
          <button
            className="btn btn-outline"
            disabled={loadingOlder}
            onClick={async () => {
              setLoadingOlder(true);
              atBottom.current = false;
              setFollowingLatest(false);
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
        {messages.map((message, index) => (
          <Fragment key={message.id}>
            {(index === 0 ||
              message.createdAt.slice(0, 10) !==
                messages[index - 1].createdAt.slice(0, 10)) && (
              <div className={styles.dateDivider}>
                <time dateTime={message.createdAt.slice(0, 10)}>
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(message.createdAt))}
                </time>
              </div>
            )}
            <article
              className={`${styles.bubble} ${message.mine ? styles.mine : styles.theirs}`}
            >
              <p className="text-xs font-medium mb-1">
                {message.mine ? "You" : message.side === "SELLER" ? "Seller" : "Buyer"}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
              <div className={styles.messageMeta}>
                <time dateTime={message.createdAt} title={message.createdAt}>
                  {message.createdAt.slice(11, 16)} UTC
                </time>
                {message.mine && <Check size={13} aria-label="Sent" />}
                {message.side !== view.side && (
                  <ReportMessage
                    conversationId={initial.id}
                    messageId={message.id}
                    body={message.body}
                  />
                )}
              </div>
            </article>
          </Fragment>
        ))}
        {request &&
          !messages.some(
            (message) => message.mine && message.clientId === request.clientId,
          ) && (
            <article className={`${styles.bubble} ${styles.mine} ${styles.pending}`}>
              <p className="whitespace-pre-wrap break-words text-sm">{request.body}</p>
              <p role="status" className="text-xs">
                {request.failed ? "Not confirmed — retry below" : "Sending…"}
              </p>
            </article>
          )}
        <div className="h-1" />
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
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <div className={styles.quickReplies} aria-label="Quick replies">
          {["Is this still available?", "When can I collect it?", "Thank you!"].map(
            (text) => (
              <button
                key={text}
                type="button"
                className={styles.quickReply}
                disabled={!!request || !view.canSend}
                onClick={() => setBody(text)}
              >
                {text}
              </button>
            ),
          )}
        </div>
        <div className={styles.composeBox}>
          <label className={styles.messageInput}>
            <span className="sr-only">Your message</span>
            <textarea
              placeholder="Write a message…"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={1}
              required
              maxLength={4000}
              disabled={!!request || !view.canSend}
            />
          </label>
          <div className={styles.sendActions}>
            <button
              className={styles.sendButton}
              disabled={sending || !view.canSend || (!request && !body.trim())}
            >
              <Send size={17} aria-hidden="true" />
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
        </div>
        <p className={styles.composeHint}>
          Keep your conversations here. Never share passwords or verification codes.
        </p>
      </form>
    </section>
  );
}
