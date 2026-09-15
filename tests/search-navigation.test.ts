import assert from "node:assert/strict";
import test from "node:test";
import { categoryUrl, searchUrl } from "../src/lib/search-navigation";

test("changing category preserves general filters and removes the old category's field and page", () => {
  const url = new URL(
    categoryUrl(
      {
        lang: "de",
        q: "desk & chair",
        city: "Peja",
        seller: "private",
        min: "10",
        page: "3",
        attribute: "phones-brand",
        value: "Apple",
      },
      "home",
    ),
    "http://localhost",
  );
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("q"), "desk & chair");
  assert.equal(url.searchParams.get("city"), "Peja");
  assert.equal(url.searchParams.get("seller"), "private");
  assert.equal(url.searchParams.get("min"), "10");
  assert.equal(url.searchParams.get("category"), "home");
  for (const key of ["page", "attribute", "value"])
    assert.equal(url.searchParams.has(key), false);
});

test("all categories clears the category while pagination retains active filters", () => {
  assert.equal(categoryUrl({ category: "phones", lang: "sq" }), "/search?lang=sq");
  assert.equal(
    searchUrl({ category: "phones", value: "Apple" }, { page: "2" }),
    "/search?category=phones&value=Apple&page=2",
  );
});
