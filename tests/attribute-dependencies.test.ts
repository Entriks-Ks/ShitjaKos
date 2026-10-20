import assert from "node:assert/strict";
import test from "node:test";
import {
  availableOptions,
  changeAttributeValue,
  searchAttributeValues,
} from "../src/lib/attribute-dependencies";
import { validateAttributes } from "../src/lib/validations/listing";

const fields = [
  {
    id: "brand",
    key: "brand",
    type: "SELECT",
    required: false,
    min: null,
    max: null,
    dependsOnId: null,
    options: ["bmw", "audi"].map((value) => ({ value, labels: { en: value } })),
  },
  {
    id: "model",
    key: "model",
    type: "SELECT",
    required: false,
    min: null,
    max: null,
    dependsOnId: "brand",
    options: [
      { value: "x3", labels: { en: "X3" }, parentValues: ["bmw"] },
      { value: "a4", labels: { en: "A4" }, parentValues: ["audi"] },
    ],
  },
];

test("model has no choices until brand is selected", () => {
  assert.deepEqual(availableOptions(fields[1], {}), []);
  assert.deepEqual(
    availableOptions(fields[1], { brand: "bmw" }).map((o) => o.value),
    ["x3"],
  );
});

test("switching or clearing brand removes the old model and preserves unrelated inputs", () => {
  assert.deepEqual(
    changeAttributeValue(
      fields,
      { brand: "bmw", model: "x3", year: 2020 },
      "brand",
      "audi",
    ),
    { brand: "audi", year: 2020 },
  );
  assert.deepEqual(
    changeAttributeValue(fields, { brand: "bmw", model: "x3" }, "brand", ""),
    { brand: "" },
  );
});

test("shared web/mobile validation rejects forged and missing brand combinations", () => {
  assert.throws(
    () => validateAttributes(fields, { brand: "audi", model: "x3" }),
    /not a valid option/,
  );
  assert.throws(() => validateAttributes(fields, { model: "x3" }), /not a valid option/);
  assert.throws(() => validateAttributes(fields, { brand: "invented", model: "x3" }));
  assert.equal(validateAttributes(fields, { brand: "bmw", model: "x3" }).length, 2);
  assert.equal(validateAttributes(fields, { brand: "bmw" }).length, 1);
});

test("search restores selected brand and model including legacy brand URLs", () => {
  assert.deepEqual(
    searchAttributeValues(fields, {
      attribute: "brand",
      value: "bmw",
      field_model: "x3",
    }),
    { brand: "bmw", model: "x3" },
  );
});

test("independent fields continue accepting their original choices", () => {
  assert.equal(availableOptions(fields[0], {}).length, 2);
  assert.deepEqual(validateAttributes(fields, {}), []);
});
