// An ephemeral Postgres engine: never reads .env or connects to Supabase.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const engine = await PGlite.create({ extensions: { pg_trgm, unaccent } });
const server = new PGLiteSocketServer({ db: engine, port: 0, host: "127.0.0.1" });
let disconnect: (() => Promise<void>) | undefined;
try {
  for (const entry of (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    await engine.exec(
      await readFile(`prisma/migrations/${entry.name}/migration.sql`, "utf8"),
    );
  }
  await server.start();
  process.env.DATABASE_URL = `postgresql://postgres:postgres@${server.getServerConn()}/postgres?sslmode=disable`;
  const { getPrisma } = await import("../src/lib/prisma");
  const api = await import("../src/services/saved-searches");
  const { anonymizeAccount } = await import("../src/repositories/users");
  const db = getPrisma();
  disconnect = () => db.$disconnect();
  const user = { id: "buyer", role: "USER", suspendedAt: null };
  const outsider = { id: "other", role: "USER", suspendedAt: null };
  for (const id of ["buyer", "seller", "other"])
    await db.user.create({
      data: {
        id,
        name: id,
        email: `${id}@example.invalid`,
        emailVerified: true,
        profile: { create: { id: `${id}-profile`, displayName: id } },
      },
    });
  await db.category.create({ data: { id: "test-category", slug: "test-category" } });
  async function listing(id: string, overrides: Record<string, unknown> = {}) {
    return db.listing.create({
      data: {
        id,
        createdById: "seller",
        personalProfileId: "seller-profile",
        categoryId: "test-category",
        title: "Oak desk",
        description: "A wooden desk",
        city: "Prishtina",
        status: "PUBLISHED",
        publishedAt: new Date(),
        priceCents: 10_000,
        ...overrides,
      },
    });
  }
  await listing("existing");
  await db.listingPublication.update({
    where: { listingId: "existing" },
    data: { createdAt: new Date("2020-01-01") },
  });
  const saved = await api.createSavedSearch(user, {
    name: "Desks",
    frequency: "DAILY",
    filters: { category: "test-category", q: "desk", city: "Prishtina", max: "200" },
  });
  await assert.rejects(
    api.createSavedSearch(user, {
      name: "Duplicate",
      frequency: "WEEKLY",
      filters: { category: "test-category", q: "desk", city: "Prishtina", max: "200.00" },
    }),
    /already saved/,
  );
  await assert.rejects(
    api.updateSavedSearch(outsider, saved.id, { name: "Hijacked", frequency: "OFF" }),
    /not found/,
  );
  await assert.rejects(api.deleteSavedSearch(outsider, saved.id), /not found/);
  await listing("match");
  await listing("too-expensive", { priceCents: 50_000 });
  await listing("wrong-city", { city: "Peja" });
  await listing("own", { createdById: "buyer", personalProfileId: "buyer-profile" });
  await listing("draft", { status: "DRAFT", publishedAt: null });
  async function due() {
    await db.savedSearch.update({
      where: { id: saved.id },
      data: { nextRunAt: new Date(0) },
    });
  }
  await due();
  assert.equal((await api.processSavedSearchAlerts()).notified, 1);
  const data = await api.getSavedSearches(user);
  assert.equal(data.alerts.length, 1);
  assert.deepEqual(
    data.alerts[0].listings.map((v) => v.id),
    ["match"],
  );
  const dailyEmails: string[] = [];
  assert.equal(
    (
      await api.processSavedSearchEmails(100, async (to, _subject, body) => {
        assert.equal(to, "buyer@example.invalid");
        assert.ok(body.includes("/listings/match"));
        dailyEmails.push(body);
      })
    ).sent,
    1,
  );
  assert.equal(
    (
      await api.processSavedSearchEmails(100, async () => {
        throw new Error("Duplicate delivery");
      })
    ).sent,
    0,
  );
  assert.equal(dailyEmails.length, 1);
  await due();
  assert.equal((await api.processSavedSearchAlerts()).notified, 0);
  await db.listing.update({ where: { id: "match" }, data: { status: "PAUSED" } });
  await db.listing.update({
    where: { id: "match" },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await due();
  assert.equal((await api.processSavedSearchAlerts()).notified, 0);
  await api.markSavedSearchRead(outsider, data.alerts[0].id);
  assert.equal((await api.getSavedSearchNotificationSummary(user)).savedSearchUnread, 1);
  await api.markSavedSearchRead(user, data.alerts[0].id);
  assert.equal((await api.getSavedSearchNotificationSummary(user)).savedSearchUnread, 0);
  await db.listing.update({ where: { id: "match" }, data: { status: "CLOSED" } });
  assert.equal((await api.getSavedSearches(user)).alerts[0].listings.length, 0);
  await db.listing.update({
    where: { id: "draft" },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await due();
  assert.equal((await api.processSavedSearchAlerts()).notified, 1);
  await db.user.update({ where: { id: "buyer" }, data: { suspendedAt: new Date() } });
  await assert.rejects(api.getSavedSearches(user), /active/);
  await due();
  assert.equal((await api.processSavedSearchAlerts()).processed, 0);
  await db.user.update({ where: { id: "buyer" }, data: { suspendedAt: null } });
  await db.category.update({ where: { id: "test-category" }, data: { active: false } });
  await api.processSavedSearchAlerts();
  const disabled = await db.savedSearch.findUniqueOrThrow({ where: { id: saved.id } });
  assert.equal(disabled.frequency, "OFF");
  assert.ok(disabled.lastError);
  await db.category.update({ where: { id: "test-category" }, data: { active: true } });
  await db.rateLimit.deleteMany({
    where: { key: { startsWith: "account-security:other:" } },
  });
  const off = await api.createSavedSearch(outsider, {
    name: "Paused alerts",
    frequency: "OFF",
    filters: { q: "lamp" },
  });
  await listing("lamp-before-enable", { title: "Desk lamp" });
  await api.updateSavedSearch(outsider, off.id, { name: "Lamps", frequency: "DAILY" });
  await listing("lamp-after-enable", { title: "Desk lamp" });
  await db.savedSearch.update({
    where: { id: off.id },
    data: { nextRunAt: new Date(0) },
  });
  await api.processSavedSearchAlerts();
  const lamps = await api.getSavedSearches(outsider);
  assert.deepEqual(
    lamps.alerts.flatMap((alert) => alert.listings.map((v) => v.id)),
    ["lamp-after-enable"],
  );
  await api.deleteSavedSearch(outsider, off.id);
  assert.equal(await db.savedSearchAlert.count({ where: { savedSearchId: off.id } }), 0);
  assert.ok(await db.listing.findUnique({ where: { id: "lamp-after-enable" } }));
  await db.rateLimit.deleteMany({
    where: { key: { startsWith: "account-security:other:" } },
  });
  await db.savedSearch.createMany({
    data: Array.from({ length: 30 }, (_, n) => ({
      userId: "other",
      name: `limit-${n}`,
      filterHash: `limit-${n}`,
      filters: {},
      frequency: "OFF" as const,
    })),
  });
  await assert.rejects(
    api.createSavedSearch(outsider, {
      name: "Too many",
      frequency: "OFF",
      filters: { q: "another" },
    }),
    /30/,
  );
  await db.rateLimit.deleteMany({
    where: { key: { startsWith: "account-security:buyer:" } },
  });
  // Clear earlier pending alerts whose searches were disabled, without sending mail.
  await api.processSavedSearchEmails(100, async () => {
    throw new Error("Disabled search sent mail");
  });
  const weekly = await api.createSavedSearch(user, {
    name: "Weekly chairs",
    frequency: "WEEKLY",
    filters: { q: "chair" },
  });
  await listing("weekly-one", { title: "Wooden chair" });
  await listing("weekly-two", { title: "Office chair" });
  assert.equal((await api.processSavedSearchAlerts()).notified, 0);
  await db.savedSearch.update({
    where: { id: weekly.id },
    data: { nextRunAt: new Date(0) },
  });
  assert.equal((await api.processSavedSearchAlerts()).notified, 1);
  let weeklyEmails = 0;
  assert.equal(
    (
      await api.processSavedSearchEmails(100, async (_to, _subject, body) => {
        assert.ok(body.includes("/listings/weekly-one"));
        assert.ok(body.includes("/listings/weekly-two"));
        weeklyEmails++;
      })
    ).sent,
    1,
  );
  assert.equal(weeklyEmails, 1);
  await db.savedSearch.update({
    where: { id: weekly.id },
    data: { nextRunAt: new Date(0) },
  });
  assert.equal((await api.processSavedSearchAlerts()).notified, 0);
  assert.equal(
    (
      await api.processSavedSearchEmails(100, async () => {
        throw new Error("Empty digest sent mail");
      })
    ).sent,
    0,
  );
  const instant = await api.createSavedSearch(user, {
    name: "Instant desks",
    frequency: "INSTANT",
    filters: { q: "desk" },
  });
  await listing("instant-match");
  async function instantDue() {
    await db.savedSearch.update({
      where: { id: instant.id },
      data: { nextRunAt: new Date(0) },
    });
  }
  await instantDue();
  await api.processSavedSearchAlerts();
  const queued = await db.savedSearchAlert.findFirstOrThrow({
    where: { savedSearchId: instant.id },
  });
  assert.ok(queued.emailNextAttemptAt);
  assert.ok(
    (await db.savedSearch.findUniqueOrThrow({ where: { id: instant.id } })).nextRunAt,
  );
  assert.equal((await api.processSavedSearchAlerts()).notified, 0);
  assert.equal(
    (
      await api.processSavedSearchEmails(100, async () => {
        throw new Error("SMTP unavailable");
      })
    ).failed,
    1,
  );
  const retry = await db.savedSearchAlert.findUniqueOrThrow({ where: { id: queued.id } });
  assert.equal(retry.emailAttempts, 1);
  assert.ok(retry.emailNextAttemptAt);
  assert.equal(retry.emailSentAt, null);
  await db.savedSearchAlert.update({
    where: { id: queued.id },
    data: { emailNextAttemptAt: new Date(0) },
  });
  const delivered: string[] = [];
  const deliver = async (to: string, _subject: string, body: string) => {
    assert.equal(to, "buyer@example.invalid");
    assert.ok(body.includes("/listings/instant-match"));
    assert.ok(body.includes("/dashboard/saved-searches"));
    delivered.push(body);
  };
  assert.equal((await api.processSavedSearchEmails(100, deliver)).sent, 1);
  assert.equal((await api.processSavedSearchEmails(100, deliver)).sent, 0);
  await instantDue();
  await api.processSavedSearchAlerts();
  assert.equal(
    await db.savedSearchAlert.count({ where: { savedSearchId: instant.id } }),
    1,
  );
  assert.equal(delivered.length, 1);
  assert.equal((await api.processSavedSearchAlerts()).notified, 0);
  // Republishing does not send the same match twice.
  await db.listing.update({
    where: { id: "instant-match" },
    data: { status: "PUBLISHED" },
  });
  await instantDue();
  await api.processSavedSearchAlerts();
  assert.equal(
    await db.savedSearchAlert.count({ where: { savedSearchId: instant.id } }),
    1,
  );
  await listing("instant-cancelled");
  await instantDue();
  await api.processSavedSearchAlerts();
  await api.updateSavedSearch(user, instant.id, {
    name: "Instant desks",
    frequency: "OFF",
  });
  assert.equal((await api.processSavedSearchEmails(100, deliver)).skipped, 1);
  await db.$transaction((tx) => anonymizeAccount(tx, "buyer", "buyer@example.invalid"));
  assert.equal(await db.savedSearch.count({ where: { userId: "buyer" } }), 0);
  assert.equal(await db.savedSearchAlert.count({ where: { userId: "buyer" } }), 0);
  const { POST } = await import("../src/app/api/cron/saved-searches/route");
  const originalSecret = process.env.SAVED_SEARCH_CRON_SECRET;
  try {
    delete process.env.SAVED_SEARCH_CRON_SECRET;
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/cron/saved-searches", { method: "POST" }),
        )
      ).status,
      503,
    );
    process.env.SAVED_SEARCH_CRON_SECRET =
      "test-scheduler-secret-with-at-least-32-characters";
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/cron/saved-searches", {
            method: "POST",
            headers: { Authorization: "Bearer wrong" },
          }),
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/cron/saved-searches", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.SAVED_SEARCH_CRON_SECRET}` },
          }),
        )
      ).status,
      200,
    );
  } finally {
    if (originalSecret === undefined) delete process.env.SAVED_SEARCH_CRON_SECRET;
    else process.env.SAVED_SEARCH_CRON_SECRET = originalSecret;
  }
  const removedQueue = await db.$queryRaw<
    Array<{ name: string | null }>
  >`SELECT to_regclass('public."SavedSearchEvent"')::text AS name`;
  assert.equal(removedQueue[0].name, null);
  console.log(
    "PASS: all migrations, filter matching, deduplication, ownership, publication, suspension, unavailable filters, and deletion cleanup.",
  );
} finally {
  await disconnect?.();
  await server.stop();
  await engine.close();
}
