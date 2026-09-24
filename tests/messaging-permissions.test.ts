import { test } from "node:test";
import assert from "node:assert/strict";
import { conversationSide } from "../src/lib/messaging/policy";

const actor = (id: string, role = "USER") => ({ id, role, suspendedAt: null });
const personal = {
  buyerId: "buyer",
  sellerUserId: "seller",
  sellerKind: "PERSONAL" as const,
  business: null,
};
const business = {
  buyerId: "buyer",
  sellerUserId: null,
  sellerKind: "BUSINESS" as const,
  business: {
    memberships: [
      { userId: "owner", role: "OWNER" },
      { userId: "manager", role: "STAFF" },
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
      business: { memberships: [{ userId: "buyer", role: "OWNER" }] },
    }),
  );
});
