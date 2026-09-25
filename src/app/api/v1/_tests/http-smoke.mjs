// Non-mutating HTTP checks. Run against a running build using API_SMOKE_URL.
import assert from "node:assert/strict";

const base = process.env.API_SMOKE_URL ?? "http://localhost:3007";
let checks = 0;
async function check(path, expected, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, expected, `${options.method ?? "GET"} ${path}`);
  assert.match(response.headers.get("cache-control") ?? "", /private/);
  checks++;
  return response;
}
for (const path of [
  "me",
  "me/listings",
  "me/businesses",
  "me/invitations",
  "favorites",
  "conversations",
  "conversations/test/messages",
  "businesses/test",
  "businesses/test/staff",
  "listings/test/edit",
  "admin/users",
  "admin/businesses",
  "admin/categories",
  "admin/reviews",
  "admin/audits",
]) {
  await check(`/api/v1/${path}`, 401);
}
for (const [method, path] of [
  ["POST", "listings"],
  ["PUT", "listings/test"],
  ["DELETE", "listings/test"],
  ["PATCH", "businesses/test"],
  ["POST", "businesses/test/invitations"],
  ["DELETE", "businesses/test/staff/test"],
  ["PUT", "admin/users/test/suspension"],
  ["POST", "conversations"],
  ["POST", "listings/test/media"],
]) {
  await check(`/api/v1/${path}`, 401, { method });
}
await check("/api/v1/me", 401, { headers: { Authorization: "Basic invalid" } });
await check("/api/v1/me", 401, {
  headers: { Authorization: "Bearer v1-smoke-invalid-session-token" },
});
const sessionResponse = await check("/api/v1/auth/session", 200, {
  method: "POST",
  headers: {
    Authorization: "Bearer v1-smoke-invalid-session-token",
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal((await sessionResponse.json()).session, null);
await check("/api/v1/me", 403, { headers: { Origin: "https://untrusted.invalid" } });
await check("/api/v1/listings?limit=99999", 400);
await check("/api/v1/shops?page=-1", 400);
await check("/api/v1/auth/sign-in", 400, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{",
});
await check("/api/v1/auth/sign-in", 413, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "x".repeat(66000),
});
await check("/api/v1/locations", 200);
const publicResponse = await check("/api/v1/listings?limit=1", 200);
const result = await publicResponse.json();
for (const item of result.items) {
  for (const field of ["contactPhone", "createdById", "personalProfileId", "storageKey"])
    assert.equal(field in item, false, `Public card leaked ${field}`);
  for (const image of item.media) assert.equal("storageKey" in image, false);
}
console.log(`${checks} HTTP checks passed; no authenticated writes or emails performed.`);
