"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

type LatestUnreadMessage = {
  messageId: string;
  conversationId: string;
  title: string;
  otherName: string;
  preview: string;
  createdAt: string;
};

export type MessageNotificationSummary = {
  savedSearchUnread: number;
  latestSavedSearch: { id: string; title: string; createdAt: string } | null;
  unread: number;
  latest: LatestUnreadMessage | null;
};

type NotificationPermissionState = NotificationPermission | "unsupported";

type MessageNotificationSnapshot = MessageNotificationSummary & {
  loading: boolean;
  permission: NotificationPermissionState;
};

const EMPTY_SUMMARY: MessageNotificationSnapshot = {
  savedSearchUnread: 0,
  latestSavedSearch: null,
  unread: 0,
  latest: null,
  loading: true,
  permission: "unsupported",
};

let snapshot = EMPTY_SUMMARY;
let timer: ReturnType<typeof setTimeout> | undefined;
let request: AbortController | undefined;
let events: EventSource | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let connected = false;
let pendingRefresh = false;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let subscribers = 0;
let initialized = false;
let newestSeenAt = 0;
let newestSeenId = "";
let newestSearchAlertAt = 0;
let newestSearchAlertId = "";
const listeners = new Set<() => void>();
const navigators = new Set<(path: string) => void>();
const chatUpdateListeners = new Set<() => void>();
const readingConversations = new Map<symbol, string>();
let readingRevision = 0;

// Exclude only the conversation currently being read from this tab's alerts.
// The stored unread state is still advanced separately, after messages arrive.
export function registerMessageNotificationReader(conversationId: string) {
  const token = Symbol();
  readingConversations.set(token, conversationId);
  readingRevision++;
  queueRefresh();
  function release() {
    if (!readingConversations.delete(token)) return;
    readingRevision++;
    if (subscribers > 0) queueRefresh();
  }
  return release;
}

function notifyChatUpdates() {
  chatUpdateListeners.forEach((listener) => listener());
}

export function isNotificationStreamConnected() {
  return connected;
}

export function subscribeChatUpdates(listener: () => void) {
  chatUpdateListeners.add(listener);
  const release = subscribe(() => {});
  return () => {
    chatUpdateListeners.delete(listener);
    release();
  };
}

function browserPermission(): NotificationPermissionState {
  return typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "unsupported";
}

function publish(next: MessageNotificationSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function rememberLatest(latest: LatestUnreadMessage | null) {
  if (!latest) return false;
  const createdAt = Date.parse(latest.createdAt);
  const isNewer =
    createdAt > newestSeenAt ||
    (createdAt === newestSeenAt && latest.messageId !== newestSeenId);
  if (createdAt >= newestSeenAt) {
    newestSeenAt = createdAt;
    newestSeenId = latest.messageId;
  }
  return isNewer;
}

function showBrowserNotification(latest: LatestUnreadMessage) {
  if (
    browserPermission() !== "granted" ||
    (document.visibilityState === "visible" && document.hasFocus())
  )
    return;

  const notification = new Notification(`New message from ${latest.otherName}`, {
    body: latest.preview || latest.title,
    tag: `message-${latest.messageId}`,
  });
  notification.onclick = () => {
    window.focus();
    navigators.values().next().value?.(`/dashboard/messages/${latest.conversationId}`);
    notification.close();
  };
}

function schedulePoll() {
  if (timer) return;
  if (subscribers > 0 && !connected && document.visibilityState === "visible") {
    timer = setTimeout(() => {
      timer = undefined;
      void loadSummary();
    }, 60_000);
  }
}

function queueRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    if (subscribers > 0) void loadSummary();
  }, 250);
}

function connectEvents() {
  if (events || !subscribers || !("EventSource" in window)) return;
  events = new EventSource("/api/v1/notifications/stream");
  events.addEventListener("ready", () => {
    connected = true;
    clearTimeout(timer);
    timer = undefined;
    queueRefresh();
    notifyChatUpdates();
  });
  events.addEventListener("changed", () => {
    queueRefresh();
    notifyChatUpdates();
  });
  events.onerror = () => {
    connected = false;
    schedulePoll();
    // EventSource reconnects automatically; ready fetches current state.
    // Some HTTP failures permanently close it, so retry those explicitly.
    if (events?.readyState === EventSource.CLOSED) {
      events.close();
      events = undefined;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectEvents, 30_000);
    }
  };
}

async function loadSummary() {
  if (!subscribers) return;
  if (request) {
    pendingRefresh = true;
    return;
  }
  const controller = new AbortController();
  request = controller;
  const revision = readingRevision;
  const readingId = readingConversations.values().next().value;
  const url = readingId
    ? `/api/v1/notifications?readingConversationId=${encodeURIComponent(readingId)}`
    : "/api/v1/notifications";

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    if ([401, 403].includes(response.status)) {
      clearTimeout(reconnectTimer);
      events?.close();
      events = undefined;
      connected = false;
      initialized = true;
      publish({
        savedSearchUnread: 0,
        latestSavedSearch: null,
        unread: 0,
        latest: null,
        loading: false,
        permission: browserPermission(),
      });
      return;
    }
    if (!response.ok) throw new Error("Could not refresh notifications.");

    const next = (await response.json()) as MessageNotificationSummary;
    // An earlier request may finish after the chat started reading. Discard it.
    if (revision !== readingRevision) {
      pendingRefresh = true;
      return;
    }
    const isNewer = rememberLatest(next.latest);
    if (initialized && isNewer && next.latest) showBrowserNotification(next.latest);
    const searchAlert = next.latestSavedSearch;
    if (searchAlert) {
      const timestamp = Date.parse(searchAlert.createdAt);
      const isNew =
        timestamp > newestSearchAlertAt ||
        (timestamp === newestSearchAlertAt && searchAlert.id !== newestSearchAlertId);
      if (
        initialized &&
        isNew &&
        browserPermission() === "granted" &&
        document.visibilityState !== "visible"
      ) {
        const alert = new Notification("New saved-search matches", {
          body: searchAlert.title,
          tag: `saved-search-${searchAlert.id}`,
        });
        alert.onclick = () => {
          window.focus();
          navigators.values().next().value?.("/dashboard/saved-searches");
          alert.close();
        };
      }
      if (timestamp >= newestSearchAlertAt) {
        newestSearchAlertAt = timestamp;
        newestSearchAlertId = searchAlert.id;
      }
    }
    initialized = true;
    publish({ ...next, loading: false, permission: browserPermission() });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    publish({ ...snapshot, loading: false, permission: browserPermission() });
  } finally {
    if (request === controller) request = undefined;
    if (pendingRefresh) {
      pendingRefresh = false;
      queueRefresh();
    }
    schedulePoll();
  }
}

function refreshWhenActive() {
  if (document.visibilityState === "visible") {
    connectEvents();
    void loadSummary();
  } else {
    clearTimeout(timer);
    timer = undefined;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  subscribers += 1;
  if (subscribers === 1) {
    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);
    void loadSummary();
    connectEvents();
  }

  return () => {
    listeners.delete(listener);
    subscribers -= 1;
    if (subscribers === 0) {
      clearTimeout(timer);
      timer = undefined;
      clearTimeout(refreshTimer);
      clearTimeout(reconnectTimer);
      events?.close();
      events = undefined;
      connected = false;
      pendingRefresh = false;
      request?.abort();
      request = undefined;
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
    }
  };
}

function serverSnapshot() {
  return EMPTY_SUMMARY;
}

export function useMessageNotifications() {
  const router = useRouter();
  useEffect(() => {
    const navigate = (path: string) => router.push(path);
    navigators.add(navigate);
    return () => {
      navigators.delete(navigate);
    };
  }, [router]);
  return useSyncExternalStore(subscribe, () => snapshot, serverSnapshot);
}

export function refreshMessageNotifications() {
  if (subscribers > 0) void loadSummary();
}

export async function requestBrowserNotificationPermission() {
  if (!("Notification" in window)) return "unsupported" as const;
  const permission = await Notification.requestPermission();
  publish({ ...snapshot, permission });
  return permission;
}
