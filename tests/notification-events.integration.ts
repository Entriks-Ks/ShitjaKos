// Run with node --conditions=react-server --import tsx --import dotenv/config tests/notification-events.integration.ts
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { subscribeNotificationEvents } from "../src/repositories/notification-events";
import { subscribeToNotifications } from "../src/services/notifications";
import { getPrisma } from "../src/lib/prisma";
import { GET } from "../src/app/api/v1/notifications/stream/route";

const context = { params: Promise.resolve({}) };
const callbacks = { changed: () => {}, disconnected: () => {} };
await assert.rejects(
  subscribeToNotifications(
    { id: randomUUID(), role: "USER", suspendedAt: new Date() },
    callbacks,
  ),
  { status: 403 },
);
try {
  await assert.rejects(
    subscribeToNotifications(
      { id: randomUUID(), role: "ADMIN", suspendedAt: null },
      callbacks,
    ),
    { status: 403 },
  );
} finally {
  await getPrisma().$disconnect();
}
const unauthenticated = await GET(
  new Request("http://localhost:3001/api/v1/notifications/stream"),
  context,
);
assert.equal(unauthenticated.status, 401);
const crossOrigin = await GET(
  new Request("http://localhost:3001/api/v1/notifications/stream", {
    headers: { origin: "https://unrelated.example" },
  }),
  context,
);
assert.equal(crossOrigin.status, 403);

const id = randomUUID();
let received = 0;
let unrelated = 0;
const unsubscribe = await subscribeNotificationEvents(id, {
  changed: () => {
    received++;
  },
  disconnected: () => {},
});
const other = await subscribeNotificationEvents(randomUUID(), {
  changed: () => {
    unrelated++;
  },
  disconnected: () => {},
});
const db = new Client({
  connectionString: process.env.NOTIFICATION_DATABASE_URL || process.env.DIRECT_URL,
});
const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
try {
  await db.connect();
  await db.query("BEGIN");
  await db.query("SELECT pg_notify('shitjakos_notifications', $1)", [id]);
  await pause();
  assert.equal(received, 0, "No event before commit");
  await db.query("ROLLBACK");
  await pause();
  assert.equal(received, 0, "Rolled-back changes send no event");
  await db.query("BEGIN");
  await db.query("SELECT pg_notify('shitjakos_notifications', $1)", [id]);
  await db.query("COMMIT");
  for (let i = 0; i < 20 && !received; i++) await pause();
  assert.equal(received, 1);
  assert.equal(unrelated, 0, "Only the target user receives the event");
  unsubscribe();
  await db.query("SELECT pg_notify('shitjakos_notifications', $1)", [id]);
  await pause();
  assert.equal(received, 1, "Unsubscribe removes delivery");
  console.log(
    "Notification event commit, rollback, isolation and cleanup checks passed.",
  );
} finally {
  unsubscribe();
  other();
  await db.end();
}
