// node --conditions=react-server --import tsx --import dotenv/config tests/performance-route.integration.ts
// Exercises bootstrap against a nonexistent target: no performance views are added.
import assert from "node:assert/strict";
import { POST } from "../src/app/api/v1/performance/views/route";
import { getPrisma } from "../src/lib/prisma";
import { VISITOR_COOKIE } from "../src/lib/performance-visitor";
const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
const url = new URL("/api/v1/performance/views", origin);
async function send(headers: Record<string, string> = {}) {
  return POST(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ kind: "shop", id: "performance-test-nonexistent" }),
    }),
    { params: Promise.resolve({}) },
  );
}
try {
  const first = await send();
  assert.equal(first.status, 202);
  assert.match(first.headers.get("set-cookie") ?? "", /HttpOnly/i);
  const { visitorToken } = await first.json();
  assert.equal((await send({ cookie: `${VISITOR_COOKIE}=${visitorToken}` })).status, 200);
  assert.equal((await send({ "x-performance-visitor": visitorToken })).status, 200);
  assert.equal((await send({ "x-performance-visitor": "forged" })).status, 202);
  assert.equal((await send({ authorization: "invalid" })).status, 401);
  const optedOut = await send({ "sec-gpc": "1" });
  assert.equal(optedOut.status, 200);
  assert.equal(optedOut.headers.get("set-cookie"), null);
  assert.equal((await send({ origin: "https://unrelated.example" })).status, 403);
  console.log(
    "Guest endpoint passed: cookie bootstrap, cookie/header retry, forgery rejection, invalid auth denial, GPC and origin checks.",
  );
} finally {
  await getPrisma().$disconnect();
}
