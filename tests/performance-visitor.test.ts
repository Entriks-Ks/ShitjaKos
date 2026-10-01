import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createVisitorToken,
  validVisitorToken,
  utcDay,
} from "../src/lib/performance-visitor";
const now = new Date("2026-10-01T23:59:00Z");
const secret = "test-only-secret";
test("guest token is valid only on issuance UTC day and with the correct secret", () => {
  const token = createVisitorToken(secret, now);
  assert.ok(validVisitorToken(token, secret, now));
  assert.equal(validVisitorToken(token, secret, new Date("2026-10-02T00:00:00Z")), false);
  assert.equal(validVisitorToken(token, "other-secret", now), false);
  assert.notEqual(createVisitorToken(secret, now), token);
  assert.equal(utcDay(now).toISOString(), "2026-10-01T00:00:00.000Z");
});
test("malformed and tampered guest tokens are rejected", () => {
  const token = createVisitorToken(secret, now);
  for (const bad of [
    undefined,
    "",
    "x".repeat(10000),
    token + "x",
    token.replace(/.$/, token.endsWith("0") ? "1" : "0"),
  ]) {
    assert.equal(validVisitorToken(bad, secret, now), false);
  }
});
