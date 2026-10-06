import test from "node:test";
import assert from "node:assert/strict";
import {
  savedSearchFilters,
  createSavedSearchInput,
  filtersFromSearchParams,
  nextSavedSearchRun,
} from "../src/lib/validations/saved-searches";

test("saved filters exclude presentation and pagination parameters", () => {
  assert.deepEqual(
    filtersFromSearchParams({
      q: "desk",
      page: "3",
      sort: "price-asc",
      lang: "sq",
      userId: "other",
    }),
    { q: "desk" },
  );
});
test("filter normalization makes equivalent prices and sellers identical", () => {
  assert.deepEqual(
    savedSearchFilters.parse({
      min: "010.00",
      seller: "verified",
      city: "Prishtina",
      country: "xk",
    }),
    { min: "10", seller: "business", city: "Prishtina" },
  );
});
test("invalid ranges and incomplete attribute filters are rejected", () => {
  for (const filters of [
    { min: "100", max: "10" },
    { attribute: "brand" },
    { attribute: "brand", value: "Apple" },
    { city: "made-up-city" },
    { max: "-1" },
    { arbitrary: "SQL" },
  ])
    assert.equal(savedSearchFilters.safeParse(filters).success, false);
});
test("clients cannot assign searches to another user", () => {
  assert.equal(
    createSavedSearchInput.safeParse({
      name: "x",
      frequency: "DAILY",
      filters: {},
      userId: "victim",
    }).success,
    false,
  );
});
test("alert intervals use elapsed days and OFF has no schedule", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  assert.equal(nextSavedSearchRun("OFF", now), null);
  assert.equal(
    nextSavedSearchRun("DAILY", now)?.toISOString(),
    "2026-10-07T12:00:00.000Z",
  );
  assert.equal(
    nextSavedSearchRun("WEEKLY", now)?.toISOString(),
    "2026-10-13T12:00:00.000Z",
  );
});
