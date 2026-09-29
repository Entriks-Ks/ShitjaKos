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
  unread: number;
  latest: LatestUnreadMessage | null;
};

type NotificationPermissionState = NotificationPermission | "unsupported";

type MessageNotificationSnapshot = MessageNotificationSummary & {
  loading: boolean;
  permission: NotificationPermissionState;
};

const EMPTY_SUMMARY: MessageNotificationSnapshot = {
  unread: 0,
  latest: null,
  loading: true,
  permission: "unsupported",
};

let snapshot = EMPTY_SUMMARY;
let timer: ReturnType<typeof setTimeout> | undefined;
let request: AbortController | undefined;
let subscribers = 0;
let initialized = false;
let newestSeenAt = 0;
let newestSeenId = "";
const listeners = new Set<() => void>();
const navigators = new Set<(path: string) => void>();

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
  clearTimeout(timer);
  if (subscribers > 0) timer = setTimeout(loadSummary, 15_000);
}

async function loadSummary() {
  request?.abort();
  const controller = new AbortController();
  request = controller;

  try {
    const response = await fetch("/api/v1/notifications", {
      cache: "no-store",
      signal: controller.signal,
    });
    if ([401, 403].includes(response.status)) {
      initialized = true;
      publish({
        unread: 0,
        latest: null,
        loading: false,
        permission: browserPermission(),
      });
      return;
    }
    if (!response.ok) throw new Error("Could not refresh notifications.");

    const next = (await response.json()) as MessageNotificationSummary;
    const isNewer = rememberLatest(next.latest);
    if (initialized && isNewer && next.latest) showBrowserNotification(next.latest);
    initialized = true;
    publish({ ...next, loading: false, permission: browserPermission() });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    publish({ ...snapshot, loading: false, permission: browserPermission() });
  } finally {
    if (request === controller) request = undefined;
    schedulePoll();
  }
}

function refreshWhenActive() {
  if (document.visibilityState === "visible") void loadSummary();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  subscribers += 1;
  if (subscribers === 1) {
    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);
    void loadSummary();
  }

  return () => {
    listeners.delete(listener);
    subscribers -= 1;
    if (subscribers === 0) {
      clearTimeout(timer);
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
