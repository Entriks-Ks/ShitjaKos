import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Exercise the shared notification store with a delayed network response.
// No browser or real user/database fixtures are needed for this timing race.
function store() {
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const responses: ((response: unknown) => void)[] = [];
  let id = 0;
  const urls: string[] = [];
  const exports = {} as {
    subscribeChatUpdates: (listener: () => void) => () => void;
    registerMessageNotificationReader: (id: string) => () => void;
    useMessageNotifications: () => { unread: number };
  };
  const source = ts.transpileModule(
    readFileSync(
      new URL("../src/hooks/use-message-notifications.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  ).outputText;
  runInNewContext(source, {
    exports,
    require: (name: string) =>
      name === "react"
        ? {
            useEffect: () => {},
            useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
          }
        : { useRouter: () => ({ push: () => {} }) },
    window: { addEventListener() {}, removeEventListener() {} },
    document: {
      visibilityState: "visible",
      hasFocus: () => true,
      addEventListener() {},
      removeEventListener() {},
    },
    AbortController,
    DOMException,
    fetch: (url: string) => {
      urls.push(url);
      return new Promise((resolve) => responses.push(resolve));
    },
    setTimeout: (callback: () => void, delay: number) => {
      timers.set(++id, { callback, delay });
      return id;
    },
    clearTimeout: (key: number) => timers.delete(key),
  });
  const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };
  return {
    api: exports,
    requests: () => responses.length,
    url: () => urls.at(-1),
    runShortTimers: async () => {
      for (const [key, timer] of [...timers]) {
        if (timer.delay <= 15_000) {
          timers.delete(key);
          timer.callback();
        }
      }
      await flush();
    },
    respond: async (unread: number) => {
      assert.ok(responses.length, "Expected a notification request");
      responses.shift()!({
        ok: true,
        status: 200,
        json: async () => ({ unread, latest: null }),
      });
      await flush();
    },
    runTimer: async () => {
      const entry = [...timers.entries()].at(-1)!;
      assert.ok(entry);
      timers.delete(entry[0]);
      entry[1].callback();
      await flush();
    },
  };
}

test("a summary started before chat reading cannot flash a stale unread badge", async () => {
  const s = store();
  const unsubscribe = s.api.subscribeChatUpdates(() => {});
  const release = s.api.registerMessageNotificationReader("active-chat");
  await s.respond(1);
  assert.equal(s.api.useMessageNotifications().unread, 0);
  release();
  await s.runTimer();
  await s.respond(0);
  assert.equal(s.api.useMessageNotifications().unread, 0);
  unsubscribe();
});

test("the active chat remains excluded across slow updates and other chats still count", async () => {
  const s = store();
  const unsubscribe = s.api.subscribeChatUpdates(() => {});
  await s.respond(0);
  const release = s.api.registerMessageNotificationReader("active-chat");
  await s.runShortTimers();
  assert.equal(s.url(), "/api/v1/notifications?readingConversationId=active-chat");
  await s.respond(2);
  assert.equal(s.api.useMessageNotifications().unread, 2);
  release();
  await s.runTimer();
  assert.equal(s.url(), "/api/v1/notifications");
  await s.respond(3);
  assert.equal(s.api.useMessageNotifications().unread, 3);
  unsubscribe();
});

test("leaving the chat restores its unread notifications", async () => {
  const s = store();
  const unsubscribe = s.api.subscribeChatUpdates(() => {});
  const release = s.api.registerMessageNotificationReader("active-chat");
  await s.respond(1);
  release();
  await s.runTimer();
  await s.respond(3);
  assert.equal(s.api.useMessageNotifications().unread, 3);
  unsubscribe();
});
