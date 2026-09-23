import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeTransaction } from "../src/lib/serial-prisma-pg";

type Transaction = Parameters<typeof serializeTransaction>[0];
const query = { sql: "SELECT 1", args: [], argTypes: [] };
const result = { columnNames: [], columnTypes: [], rows: [] };
function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    provider: "postgres",
    adapterName: "test",
    options: { usePhantomQuery: false },
    queryRaw: async () => result,
    executeRaw: async () => 1,
    commit: async () => {},
    rollback: async () => {},
    ...overrides,
  };
}

test("queries and cleanup wait for the current connection operation", async () => {
  const events: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tx = serializeTransaction(
    transaction({
      queryRaw: async () => {
        events.push("read");
        await gate;
        events.push("read complete");
        return result;
      },
      executeRaw: async () => {
        events.push("write");
        return 1;
      },
      commit: async () => {
        events.push("commit");
      },
    }),
  );
  const read = tx.queryRaw(query);
  const write = tx.executeRaw(query);
  const commit = tx.commit();
  await Promise.resolve();
  assert.deepEqual(events, ["read"]);
  release();
  await Promise.all([read, write, commit]);
  assert.deepEqual(events, ["read", "read complete", "write", "commit"]);
});

test("a failed query rejects its caller without preventing rollback", async () => {
  const failure = new Error("query failed");
  let rolledBack = false;
  const tx = serializeTransaction(
    transaction({
      queryRaw: async () => {
        throw failure;
      },
      rollback: async () => {
        rolledBack = true;
      },
    }),
  );
  const read = tx.queryRaw(query);
  const rollback = tx.rollback();
  await assert.rejects(read, (error) => error === failure);
  await rollback;
  assert.equal(rolledBack, true);
});

test("separate transactions can progress independently", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = serializeTransaction(
    transaction({
      queryRaw: async () => {
        await gate;
        return result;
      },
    }),
  );
  const second = serializeTransaction(transaction());
  const waiting = first.queryRaw(query);
  try {
    assert.equal(await second.executeRaw(query), 1);
  } finally {
    release();
    await waiting;
  }
});
