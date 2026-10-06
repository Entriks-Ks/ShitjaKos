import { test } from "node:test";
import assert from "node:assert/strict";
import { assertAccountDeletionAllowed } from "../src/lib/permissions";

const user = { id: "user", role: "USER", suspendedAt: null, deletedAt: null };
test("ordinary users and workers without an owned shop can delete their account", () => {
  assert.doesNotThrow(() => assertAccountDeletionAllowed(user, false));
});
test("shop owners cannot abandon a shop by deleting their account", () => {
  assert.throws(() => assertAccountDeletionAllowed(user, true), /shops/);
});
test("privileged accounts cannot self-delete", () => {
  for (const role of ["ADMIN", "MODERATOR", "SUPPORT"])
    assert.throws(
      () => assertAccountDeletionAllowed({ ...user, role }, false),
      /administrator/,
    );
});
test("deleted and suspended identities cannot request deletion again", () => {
  assert.throws(() =>
    assertAccountDeletionAllowed({ ...user, deletedAt: new Date() }, false),
  );
  assert.throws(() =>
    assertAccountDeletionAllowed({ ...user, suspendedAt: new Date() }, false),
  );
});
