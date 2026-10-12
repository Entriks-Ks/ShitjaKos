import { test } from "node:test";
import assert from "node:assert/strict";
import { contentReportInput, reviewContentReportInput } from "../src/lib/validations/content-reports";
test("reports accept only supported targets and reasons", () => {
  assert.equal(contentReportInput.safeParse({ targetKind: "USER", targetId: "a", reason: "SCAM" }).success, false);
  assert.equal(contentReportInput.safeParse({ targetKind: "LISTING", targetId: "a", reason: "SCAM" }).success, true);
});
test("other reports need explanation and oversized details are rejected", () => {
  assert.equal(contentReportInput.safeParse({ targetKind: "BUSINESS", targetId: "a", reason: "OTHER", details: "short" }).success, false);
  assert.equal(contentReportInput.safeParse({ targetKind: "BUSINESS", targetId: "a", reason: "SCAM", details: "x".repeat(1001) }).success, false);
});
test("reporter identity and status cannot be supplied by client", () => {
  const input = contentReportInput.parse({ targetKind: "LISTING", targetId: "a", reason: "SCAM", reporterId: "victim", status: "RESOLVED" });
  assert.equal("reporterId" in input, false);
  assert.equal("status" in input, false);
});
test("review requires note and cannot reopen finalized cases", () => {
  assert.equal(reviewContentReportInput.safeParse({ id: "a", expectedStatus: "RESOLVED", status: "INVESTIGATING", note: "Investigate" }).success, false);
  assert.equal(reviewContentReportInput.safeParse({ id: "a", expectedStatus: "OPEN", status: "DISMISSED", note: "" }).success, false);
});
