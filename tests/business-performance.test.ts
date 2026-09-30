import { test } from "node:test";
import assert from "node:assert/strict";
import {
  performanceRange,
  performanceViewInput,
} from "../src/lib/validations/business-performance";
const now = new Date("2026-09-30T15:30:00Z");
test("performance defaults to 30 inclusive UTC days", () => {
  const range = performanceRange({}, now);
  assert.equal(range.from.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(range.until.toISOString(), "2026-10-01T00:00:00.000Z");
});
test("performance allows a single day and rejects invalid, future and excessive ranges", () => {
  assert.equal(
    performanceRange({ from: "2026-09-30", to: "2026-09-30" }, now).until.toISOString(),
    "2026-10-01T00:00:00.000Z",
  );
  for (const input of [
    { from: "2026-02-30" },
    { from: "2026-09-30", to: "2026-09-01" },
    { to: "2027-01-01" },
    { from: "2020-01-01" },
  ])
    assert.throws(() => performanceRange(input, now));
});
test("tracking accepts only supported targets and strips client supplied identity", () => {
  assert.deepEqual(
    performanceViewInput.parse({
      kind: "shop",
      id: "shop-id",
      userId: "victim",
      views: 100,
    }),
    { kind: "shop", id: "shop-id" },
  );
  assert.throws(() => performanceViewInput.parse({ kind: "user", id: "id" }));
});
