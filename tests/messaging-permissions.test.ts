import { test } from "node:test";
import assert from "node:assert/strict";
import { conversationSide } from "../src/lib/messaging/policy";

const actor = (id: string, role = "USER") => ({ id, role, suspendedAt: null });
const personal = {
  createdAt: new Date("2026-10-01T12:00:00Z"),
  buyerId: "buyer",
  sellerUserId: "seller",
  sellerKind: "PERSONAL" as const,
  business: null,
};
const business = {
  createdAt: new Date("2026-10-01T12:00:00Z"),
  buyerId: "buyer",
  sellerUserId: null,
  sellerKind: "BUSINESS" as const,
  business: {
    memberships: [
      { userId: "owner", role: "OWNER", joinedAt: new Date("2026-10-01T13:00:00Z") },
      { userId: "manager", role: "STAFF", joinedAt: new Date("2026-10-01T11:00:00Z") },
    ],
  },
};

test("personal conversation allows only its buyer and seller", () => {
  assert.equal(conversationSide(actor("buyer"), personal), "BUYER");
  assert.equal(conversationSide(actor("seller"), personal), "SELLER");
  assert.throws(() => conversationSide(actor("other"), personal));
});
test("an unrelated admin cannot read private messages", () => {
  assert.throws(() => conversationSide(actor("admin", "ADMIN"), personal));
});
test("current business owners and staff can access the shared inbox", () => {
  assert.equal(conversationSide(actor("owner"), business), "SELLER");
  assert.equal(conversationSide(actor("manager"), business), "SELLER");
});
test("removed members and deleted businesses do not grant seller access", () => {
  assert.throws(() => conversationSide(actor("former"), business));
  assert.throws(() => conversationSide(actor("owner"), { ...business, business: null }));
  assert.equal(
    conversationSide(actor("buyer"), { ...business, business: null }),
    "BUYER",
  );
});
test("suspended and ambiguous identities are denied", () => {
  assert.throws(() =>
    conversationSide({ ...actor("buyer"), suspendedAt: new Date() }, personal),
  );
  assert.throws(() =>
    conversationSide(actor("buyer"), {
      ...business,
      business: {
        memberships: [{ userId: "buyer", role: "OWNER", joinedAt: new Date(0) }],
      },
    }),
  );
});

test("staff cannot access conversations started before joining, even with new replies", () => {
  assert.throws(
    () =>
      conversationSide(actor("manager"), {
        ...business,
        createdAt: new Date("2026-10-01T10:00:00Z"),
      }),
    { status: 404 },
  );
});

test("staff access starts at the membership timestamp", () => {
  assert.equal(
    conversationSide(actor("manager"), {
      ...business,
      createdAt: new Date("2026-10-01T11:00:00Z"),
    }),
    "SELLER",
  );
});
