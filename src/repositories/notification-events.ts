import "server-only";
import { Client } from "pg";

type Subscriber = { changed: () => void; disconnected: () => void };
type Hub = {
  client?: Client;
  connecting?: Promise<void>;
  subscribers: Map<string, Set<Subscriber>>;
};
const globals = globalThis as typeof globalThis & { notificationHub?: Hub };
const hub: Hub = (globals.notificationHub ??= { subscribers: new Map() });

async function connect() {
  if (hub.client) return;
  if (hub.connecting) return hub.connecting;
  hub.connecting = (async () => {
    // LISTEN requires a dedicated session, never the transaction-mode pooler.
    const connectionString =
      process.env.NOTIFICATION_DATABASE_URL || process.env.DIRECT_URL;
    if (!connectionString) throw new Error("A session database URL is required for SSE.");
    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 5000,
      keepAlive: true,
    });
    const disconnected = () => {
      if (hub.client !== client) return;
      hub.client = undefined;
      for (const group of [...hub.subscribers.values()]) {
        for (const subscriber of [...group]) subscriber.disconnected();
      }
      void client.end().catch(() => {});
    };
    client.on("error", disconnected);
    client.on("end", disconnected);
    client.on("notification", (event) => {
      if (event.channel !== "shitjakos_notifications" || !event.payload) return;
      for (const subscriber of hub.subscribers.get(event.payload) ?? [])
        subscriber.changed();
    });
    try {
      await client.connect();
      await client.query("LISTEN shitjakos_notifications");
      hub.client = client;
    } catch (error) {
      await client.end().catch(() => {});
      throw error;
    }
  })();
  try {
    await hub.connecting;
  } finally {
    hub.connecting = undefined;
  }
}

export async function subscribeNotificationEvents(
  userId: string,
  subscriber: Subscriber,
) {
  await connect();
  const group = hub.subscribers.get(userId) ?? new Set<Subscriber>();
  const total = [...hub.subscribers.values()].reduce((n, entries) => n + entries.size, 0);
  if (group.size >= 5 || total >= 2000)
    throw new Error("Notification connection limit reached.");
  group.add(subscriber);
  hub.subscribers.set(userId, group);
  return () => {
    group.delete(subscriber);
    if (!group.size) hub.subscribers.delete(userId);
    if (!hub.subscribers.size && hub.client) {
      const client = hub.client;
      hub.client = undefined;
      void client.end().catch(() => {});
    }
  };
}
