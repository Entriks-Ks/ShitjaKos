import { test } from "node:test";
import assert from "node:assert/strict";
import {
  businessCategoryIds,
  shopFilters,
} from "../src/lib/validations/business-categories";
test("business category selections require a primary and at most three extras", () => {
  for (const ids of [[], ["a", "b", "c", "d", "e"], ["a", "a"], [" "]])
    assert.equal(businessCategoryIds.safeParse(ids).success, false);
  assert.deepEqual(businessCategoryIds.parse(["b", "a"]), ["b", "a"]);
});
test("shop filters strip unrelated input and bound query size", () => {
  assert.deepEqual(
    shopFilters.parse({ category: "a", city: "Prishtina", role: "ADMIN" }),
    { category: "a", city: "Prishtina" },
  );
  assert.equal(shopFilters.safeParse({ category: "x".repeat(101) }).success, false);
});
