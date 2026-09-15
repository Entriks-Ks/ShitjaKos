import { test } from "node:test";
import assert from "node:assert/strict";
import { canManageListing, canTransition, isStaff } from "../src/lib/permissions";
import { validateAttributes } from "../src/lib/validations/listing";
import { fieldInput } from "../src/lib/validations/admin-catalog";
const actor = { id: "alice", role: "USER", suspendedAt: null };
test("personal ownership never grants access to someone else's listing", () => {
  assert.equal(
    canManageListing(actor, { personalProfile: { userId: "alice" }, business: null }),
    true,
  );
  assert.equal(
    canManageListing(actor, { personalProfile: { userId: "bob" }, business: null }),
    false,
  );
});
test("business access requires membership of the correct business", () => {
  assert.equal(
    canManageListing(actor, {
      personalProfile: null,
      business: { memberships: [{ userId: "bob", role: "OWNER" }] },
    }),
    false,
  );
  assert.equal(
    canManageListing(actor, {
      personalProfile: null,
      business: { memberships: [{ userId: "alice", role: "OWNER" }] },
    }),
    true,
  );
  assert.equal(
    canManageListing(
      { ...actor, suspendedAt: new Date() },
      { personalProfile: { userId: "alice" }, business: null },
    ),
    false,
  );
});
test("closed listings cannot be republished and arbitrary status transitions fail", () => {
  assert.equal(canTransition("SOLD", "PUBLISHED"), false);
  assert.equal(canTransition("DRAFT", "SOLD"), false);
  assert.equal(canTransition("PAUSED", "PUBLISHED"), true);
});
test("only active admins may manage the catalog", () => {
  assert.equal(isStaff({ ...actor, role: "ADMIN" }), true);
  assert.equal(isStaff({ ...actor, role: "ADMIN", suspendedAt: new Date() }), false);
  assert.equal(isStaff(actor), false);
});
const storage = {
  id: "storage",
  key: "storage",
  type: "NUMBER",
  required: true,
  min: 1,
  max: 4096,
  options: [],
};
test("category attributes reject cross-category fields, invalid types and out-of-range numbers", () => {
  assert.throws(
    () => validateAttributes([storage], { storage: 256, frameSize: 52 }),
    /belong/,
  );
  assert.throws(() => validateAttributes([storage], { storage: true }), /number/);
  assert.throws(() => validateAttributes([storage], { storage: 8192 }), /range/);
  assert.throws(() => validateAttributes([storage], {}), /required/);
  assert.deepEqual(validateAttributes([storage], { storage: "256" }), [
    { attributeId: "storage", value: 256 },
  ]);
});
test("select answers use stable allowed values and booleans preserve false", () => {
  const brand = {
    ...storage,
    id: "brand",
    key: "brand",
    type: "SELECT",
    options: [{ value: "Apple" }],
  };
  assert.throws(() => validateAttributes([brand], { brand: "Not a brand" }), /option/);
  assert.deepEqual(
    validateAttributes([{ ...storage, type: "BOOLEAN" }], { storage: false }),
    [{ attributeId: "storage", value: false }],
  );
});
test("catalog fields reject choices without enough options and invalid number ranges", () => {
  const names = { sq: "Gjendja", en: "Condition", de: "Zustand" };
  const choice = { sq: "E re", en: "New", de: "Neu" };
  const field = {
    categoryId: "subcategory",
    names,
    type: "SELECT",
    required: false,
    filterable: true,
    unit: "",
    min: null,
    max: null,
    options: [choice, { sq: "E përdorur", en: "Used", de: "Gebraucht" }],
  };
  assert.equal(fieldInput.safeParse(field).success, true);
  assert.equal(fieldInput.safeParse({ ...field, options: [choice] }).success, false);
  assert.equal(
    fieldInput.safeParse({ ...field, type: "NUMBER", options: [], min: 10, max: 5 })
      .success,
    false,
  );
  assert.equal(
    fieldInput.safeParse({ ...field, type: "TEXT", options: [], filterable: true })
      .success,
    false,
  );
});
