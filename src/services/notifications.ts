import "server-only";
import type { Actor } from "@/lib/permissions";
import { ChatError } from "@/lib/messaging/policy";
import { findChatActor } from "@/repositories/messaging";
import { subscribeNotificationEvents } from "@/repositories/notification-events";
import { withTransaction } from "@/repositories/transaction";

type NotificationSubscriber = {
  changed: () => void;
  disconnected: () => void;
};

export async function subscribeToNotifications(
  actor: Actor,
  subscriber: NotificationSubscriber,
) {
  if (actor.suspendedAt) {
    throw new ChatError("An active, verified account is required.", 403);
  }

  // Match messaging access even when called outside the HTTP API.
  // End the short read transaction before opening the long-lived subscription.
  const current = await withTransaction((tx) => findChatActor(tx, actor.id));
  if (!current || current.suspendedAt || !current.emailVerified) {
    throw new ChatError("An active, verified account is required.", 403);
  }

  // Always subscribe to the authenticated actor's own inbox. Callers cannot
  // supply a separate recipient or use an admin role to watch another user.
  return subscribeNotificationEvents(current.id, subscriber);
}
