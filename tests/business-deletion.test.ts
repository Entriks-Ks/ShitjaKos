import { test } from "node:test";
import assert from "node:assert/strict";
import { assertBusinessDeletionAllowed } from "../src/lib/permissions";

const owner = { id: "owner", role: "USER", suspendedAt: null };
const membership = { userId: owner.id, role: "OWNER" };

test("an active owner can delete an empty business", () => {
  assert.doesNotThrow(() => assertBusinessDeletionAllowed(owner, membership, 0));
});

test("business deletion rejects managers, outsiders, and suspended owners", () => {
  assert.throws(() =>
    assertBusinessDeletionAllowed(owner, { ...membership, role: "MANAGER" }, 0),
  );
  assert.throws(() =>
    assertBusinessDeletionAllowed(owner, { ...membership, userId: "other" }, 0),
  );
  assert.throws(() => assertBusinessDeletionAllowed(owner, null, 0));
  assert.throws(() =>
    assertBusinessDeletionAllowed({ ...owner, suspendedAt: new Date() }, membership, 0),
  );
});

test("business deletion preserves remaining listings", () => {
  assert.throws(
    () => assertBusinessDeletionAllowed(owner, membership, 1),
    /listings first/,
  );
});
