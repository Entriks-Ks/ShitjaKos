import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSearchText,
  parseNaturalSearch,
  searchWords,
} from "../src/lib/listing-search";

test("normalizes Albanian accents and punctuation", () => {
  assert.equal(normalizeSearchText("  Rroba për Gra!  "), "rroba per gra");
  assert.deepEqual(searchWords("Samsung-telefon"), ["samsung", "telefon"]);
});

test("parses supported natural search filters", () => {
  assert.deepEqual(parseNaturalSearch("telefon ne Prishtina nen 200"), {
    max: "200",
    city: "Prishtina",
  });
  assert.deepEqual(parseNaturalSearch("rroba te reja nga 20 deri 100"), {
    min: "20",
    max: "100",
    condition: "NEW",
  });
});
