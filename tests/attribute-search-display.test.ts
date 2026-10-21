import assert from "node:assert/strict";
import test from "node:test";
import { parseAttributeFilters } from "../src/lib/attribute-search";
import {
  availableOptions,
  changeAttributeValue,
  searchAttributeValues,
} from "../src/lib/attribute-dependencies";
import { savedSearchFilters } from "../src/lib/validations/saved-searches";
import {
  fieldDefinitionInput,
  fieldEditInput,
} from "../src/lib/validations/admin-catalog";

test("multiple choices survive saved searches and restoration without splitting punctuation", () => {
  const params = {
    category: "cars",
    choices_brand: JSON.stringify(["bmw", "audi", "a,b", "bmw"]),
  };
  assert.equal(savedSearchFilters.safeParse(params).success, true);
  assert.deepEqual(parseAttributeFilters(params), [
    { id: "brand", choices: ["a,b", "audi", "bmw"] },
  ]);
  assert.deepEqual(searchAttributeValues([{ id: "brand", options: [] }], params).brand, [
    "a,b",
    "audi",
    "bmw",
  ]);
});
test("malformed and conflicting selections fail closed", () => {
  for (const raw of [
    "null",
    "{}",
    "[1]",
    "[]",
    JSON.stringify(Array(51).fill("a")),
    JSON.stringify(["x".repeat(201)]),
  ]) {
    assert.deepEqual(parseAttributeFilters({ choices_brand: raw }), []);
    assert.equal(
      savedSearchFilters.safeParse({ category: "cars", choices_brand: raw }).success,
      false,
    );
  }
  assert.deepEqual(
    parseAttributeFilters({ choices_brand: '["bmw"]', field_brand: "audi" }),
    [],
  );
  assert.deepEqual(
    parseAttributeFilters({ field_brand: "audi", choices_brand: '["bmw"]' }),
    [],
  );
});
test("dependent choices combine selected brands and reset when parent changes", () => {
  const fields = [
    { id: "brand", options: [] },
    {
      id: "model",
      dependsOnId: "brand",
      options: [
        { value: "x3", labels: { en: "X3" }, parentValues: ["bmw"] },
        { value: "a4", labels: { en: "A4" }, parentValues: ["audi"] },
      ],
    },
  ];
  assert.equal(availableOptions(fields[1], { brand: ["bmw", "audi"] }).length, 2);
  assert.deepEqual(availableOptions(fields[1], { brand: [] }), []);
  assert.deepEqual(
    changeAttributeValue(fields, { brand: ["bmw", "audi"], model: ["x3"] }, "brand", [
      "audi",
    ]),
    { brand: ["audi"] },
  );
});
test("admin display setting defaults safely and rejects unsupported styles", () => {
  const base = {
    names: { sq: "Brand", en: "Brand", de: "Marke" },
    type: "SELECT",
    required: false,
    filterable: true,
    min: null,
    max: null,
    options: [
      { sq: "BMW", en: "BMW", de: "BMW" },
      { sq: "Audi", en: "Audi", de: "Audi" },
    ],
  };
  assert.equal(fieldDefinitionInput.parse(base).filterDisplay, "DROPDOWN");
  for (const filterDisplay of ["DROPDOWN", "RADIO", "CHECKBOX"])
    assert.equal(
      fieldDefinitionInput.safeParse({ ...base, filterDisplay }).success,
      true,
    );
  assert.equal(
    fieldDefinitionInput.safeParse({ ...base, filterDisplay: "HTML" }).success,
    false,
  );
  const edit = {
    ...base,
    options: base.options.map((names) => ({ value: names.en, names })),
  };
  assert.equal(fieldEditInput.parse(edit).filterDisplay, undefined);
});
