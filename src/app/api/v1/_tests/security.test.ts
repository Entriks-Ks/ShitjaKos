import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeApiRequest } from "../_shared/authorization";
import {
  ApiError,
  boundedBytes,
  checkOrigin,
  readJson,
  pagination,
} from "../_shared/input";

const actor = { id: "real-user", role: "USER", suspendedAt: null, emailVerified: true };
const defaults = {
  session: async () => ({ user: { id: actor.id } }),
  user: async () => actor,
  budget: async () => true,
};
const status = (expected: number) => (error: unknown) =>
  error instanceof ApiError && error.status === expected;

test("bearer credentials cannot fall back to a valid website cookie", async () => {
  await assert.rejects(
    authorizeApiRequest(
      new Request("https://example.test/api/v1/me", {
        headers: { authorization: "Bearer invalid", cookie: "valid-web-session" },
      }),
      {
        ...defaults,
        session: async (headers, bearer) => {
          assert.equal(bearer, true);
          assert.equal(headers.has("cookie"), false);
          return null;
        },
      },
    ),
    status(401),
  );
});
test("malformed authorization is rejected before session lookup", async () => {
  await assert.rejects(
    authorizeApiRequest(
      new Request("https://example.test", { headers: { authorization: "Basic abc" } }),
      {
        ...defaults,
        session: async () => {
          throw new Error("must not execute");
        },
      },
    ),
    status(401),
  );
});
test("database suspension overrides an otherwise valid session", async () => {
  await assert.rejects(
    authorizeApiRequest(new Request("https://example.test"), {
      ...defaults,
      user: async () => ({ ...actor, suspendedAt: new Date() }),
    }),
    status(403),
  );
});
test("unverified accounts cannot use protected API features", async () => {
  await assert.rejects(
    authorizeApiRequest(new Request("https://example.test"), {
      ...defaults,
      user: async () => ({ ...actor, emailVerified: false }),
    }),
    status(403),
  );
});
test("ordinary users cannot access admin APIs", async () => {
  await assert.rejects(
    authorizeApiRequest(new Request("https://example.test"), defaults, true),
    status(403),
  );
});
test("actor identity comes from the session and never from submitted identifiers", async () => {
  const user = await authorizeApiRequest(
    new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ userId: "admin", role: "ADMIN" }),
    }),
    {
      ...defaults,
      user: async (id) => {
        assert.equal(id, actor.id);
        return actor;
      },
      budget: async (id, write) => {
        assert.equal(id, actor.id);
        assert.equal(write, true);
        return true;
      },
    },
  );
  assert.equal(user.role, "USER");
});
test("rate-limit exhaustion stops a request", async () => {
  await assert.rejects(
    authorizeApiRequest(new Request("https://example.test"), {
      ...defaults,
      budget: async () => false,
    }),
    status(429),
  );
});
test("cross-origin requests are rejected", () => {
  assert.throws(
    () =>
      checkOrigin(
        new Request("https://example.test", {
          headers: { origin: "https://untrusted.invalid" },
        }),
      ),
    status(403),
  );
});
test("streamed bodies without content-length are still bounded", async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(10));
      controller.enqueue(new Uint8Array(10));
      controller.close();
    },
  });
  const request = new Request("https://example.test", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(boundedBytes(request, 15), status(413));
});
test("JSON arrays and malformed JSON are rejected", async () => {
  for (const body of ["[]", "null", "{"]) {
    await assert.rejects(
      readJson(
        new Request("https://example.test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        }),
      ),
      status(400),
    );
  }
});
test("pagination prevents oversized and negative queries", () => {
  for (const value of [{ limit: 100000 }, { page: -1 }, { page: 1.5 }, { page: 1001 }])
    assert.equal(pagination.safeParse(value).success, false);
});
