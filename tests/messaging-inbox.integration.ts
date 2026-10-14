import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
const engine = await PGlite.create({ extensions: { pg_trgm, unaccent } });
const server = new PGLiteSocketServer({ db: engine, port: 0, host: "127.0.0.1" });
let disconnect: (() => Promise<void>) | undefined;
try {
  for (const entry of (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name)))
    await engine.exec(
      await readFile(`prisma/migrations/${entry.name}/migration.sql`, "utf8"),
    );
  await server.start();
  process.env.DATABASE_URL = `postgresql://postgres:postgres@${server.getServerConn()}/postgres?sslmode=disable`;
  const { getPrisma } = await import("../src/lib/prisma");
  const { getChatInbox } = await import("../src/services/messaging");
  const { countUnreadForConversations } = await import("../src/repositories/messaging");
  const db = getPrisma();
  disconnect = () => db.$disconnect();
  for (const id of ["buyer", "seller", "other"]) {
    await db.user.create({
      data: { id, name: id, email: `${id}@example.invalid`, emailVerified: true },
    });
  }
  for (const id of ["a", "b", "zero", "hidden", "unrelated"]) {
    await db.conversation.create({
      data: {
        id,
        sourceListingId: id,
        listingTitle: id,
        sellerName: "seller",
        buyerId: id === "unrelated" ? "other" : "buyer",
        sellerKind: "PERSONAL",
        sellerUserId: "seller",
      },
    });
    for (let sequence = 1; sequence <= 5; sequence++) {
      const side = sequence === 4 ? "BUYER" : "SELLER";
      await db.message.create({
        data: {
          conversationId: id,
          senderId: side === "BUYER" ? "buyer" : "seller",
          senderSide: side,
          clientId: `${id}-${sequence}`,
          sequence,
          body: "Message",
        },
      });
    }
  }
  for (const [conversationId, lastSequence, deletedThroughSequence, deletedAt] of [
    ["a", 1, 3, null],
    ["b", 2, 0, null],
    ["zero", 5, 0, null],
    ["hidden", 0, 0, new Date()],
  ] as const) {
    await db.conversationReadState.create({
      data: {
        conversationId,
        userId: "buyer",
        lastSequence,
        deletedThroughSequence,
        deletedAt,
      },
    });
  }
  const inbox = await getChatInbox({ id: "buyer", role: "USER", suspendedAt: null });
  assert.deepEqual(
    Object.fromEntries(inbox.items.map((item) => [item.id, item.unread])),
    { a: 1, b: 2, zero: 0 },
  );
  assert.equal(inbox.hasMore, false);
  // Compare grouped counts to independent counts for both participant sides.
  await db.$transaction(async (tx) => {
    const scopes = [
      { conversationId: "a", side: "BUYER" as const, after: 3 },
      { conversationId: "b", side: "SELLER" as const, after: 0 },
      { conversationId: "zero", side: "BUYER" as const, after: 5 },
    ];
    const counts = await countUnreadForConversations(tx, scopes);
    for (const scope of scopes) {
      const expected = await tx.message.count({
        where: {
          conversationId: scope.conversationId,
          senderSide: { not: scope.side },
          sequence: { gt: scope.after },
        },
      });
      assert.equal(counts.get(scope.conversationId) ?? 0, expected);
    }
  });
  assert.equal(
    (
      await countUnreadForConversations(
        {} as Parameters<typeof countUnreadForConversations>[0],
        [],
      )
    ).size,
    0,
  );
  console.log(
    "Inbox integration passed: batched counts, both sides, read/deletion boundaries, hidden/unrelated conversations, zero unread and empty input.",
  );
} finally {
  await disconnect?.();
  await server.stop();
  await engine.close();
}
