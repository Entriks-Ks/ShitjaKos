"use client";

import { useEffect, useState } from "react";
import Link from "@/components/navigation-link";

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
    <section>
      {error && (
        <p role="status" className="notice mb-4">
          {error}
        </p>
      )}
      <div className="space-y-3">
        {data.items.map((item) => (
          <Link
            key={item.id}
            href={"/dashboard/messages/" + item.id}
            className="workspace-card block"
          >
            <div className="flex justify-between gap-3">
              <strong>{item.otherName}</strong>
              {item.unread > 0 && <span className="pill">{item.unread} unread</span>}
            </div>
            <p className="mt-1 font-medium">{item.title}</p>
            <p className="muted mt-2 truncate">{item.preview}</p>
          </Link>
        ))}
        {!data.items.length && !error && (
          <p className="workspace-card muted">No conversations yet.</p>
        )}
      </div>
      <nav className="flex justify-between mt-5" aria-label="Conversation pages">
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
    </section>
  );
}
