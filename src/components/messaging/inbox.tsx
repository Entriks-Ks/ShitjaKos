"use client";

import { useEffect, useState } from "react";
import Link from "@/components/navigation-link";
import { ArrowUpRight, MessageCircle, Search } from "lucide-react";
import styles from "./messaging.module.css";

type InboxData = {
  items: {
    id: string;
    title: string;
    otherName: string;
    preview: string;
    unread: number;
  }[];
  hasMore: boolean;
};

export function MessagingInbox({ initial, page }: { initial: InboxData; page: number }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const unreadCount = data.items.filter((item) => item.unread > 0).length;
  const items = data.items.filter(
    (item) =>
      (!unreadOnly || item.unread > 0) &&
      `${item.otherName} ${item.title} ${item.preview}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    async function poll() {
      try {
        if (document.visibilityState !== "visible") return;
        const response = await fetch("/api/v1/conversations?page=" + page, {
          cache: "no-store",
          signal: controller.signal,
        });
        if ([401, 403].includes(response.status)) {
          stopped = true;
          setData({ items: [], hasMore: false });
          setError("Your session is unavailable. Sign in again.");
          return;
        }
        if (!response.ok) throw new Error("refresh");
        const next: InboxData = await response.json();
        if (!controller.signal.aborted) {
          setData(next);
          setError("");
        }
      } catch {
        if (!controller.signal.aborted)
          setError("Inbox update failed. Retrying shortly.");
      } finally {
        if (!controller.signal.aborted && !stopped) timer = setTimeout(poll, 15000);
      }
    }
    timer = setTimeout(poll, 15000);
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [page]);

  return (
    <section className={styles.inbox} aria-label="Conversation inbox">
      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label="Filter conversations">
          <button
            type="button"
            aria-pressed={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
          >
            All messages
          </button>
          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly(true)}
          >
            Unread <span>{unreadCount}</span>
          </button>
        </div>
        <label className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Search conversations on this page"
            placeholder="Search this page…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {error && (
        <p role="status" className="notice mb-4">
          {error}
        </p>
      )}
      <div className={styles.rows}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={"/dashboard/messages/" + item.id}
            className={`${styles.row} ${item.unread > 0 ? styles.unread : ""}`}
          >
            <span className={styles.avatar} aria-hidden="true">
              {item.otherName.trim().slice(0, 2).toUpperCase() || "?"}
            </span>
            <div className={styles.rowContent}>
              <strong>{item.otherName}</strong>
              <p className={styles.listingTitle}>{item.title}</p>
              <p className={styles.preview}>{item.preview || "Start the conversation"}</p>
            </div>
            <div className={styles.rowEnd}>
              {item.unread > 0 && (
                <span
                  className={styles.badge}
                  aria-label={`${item.unread} unread messages`}
                >
                  {item.unread > 99 ? "99+" : item.unread}
                </span>
              )}
              <ArrowUpRight size={18} aria-hidden="true" />
            </div>
          </Link>
        ))}
        {!items.length && !error && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <MessageCircle size={30} aria-hidden="true" />
            </span>
            <h2>
              {query
                ? "No matching conversations"
                : unreadOnly
                  ? "You’re all caught up"
                  : "Good conversations start here"}
            </h2>
            <p>
              {query
                ? "Try a different name or listing title."
                : unreadOnly
                  ? "There are no unread conversations on this page."
                  : "Find something you like and message the seller. Your conversations will appear here."}
            </p>
            {!query && !unreadOnly && (
              <Link href="/search" className="btn btn-primary">
                Explore listings <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        )}
      </div>
      {(page > 1 || data.hasMore) && (
        <nav className={styles.pagination} aria-label="Conversation pages">
          {page > 1 ? (
            <Link className="btn btn-outline" href={"?page=" + (page - 1)}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          {data.hasMore && (
            <Link className="btn btn-outline" href={"?page=" + (page + 1)}>
              Next
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
