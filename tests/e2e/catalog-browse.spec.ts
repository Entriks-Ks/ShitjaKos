import { test, expect } from "@playwright/test";

test("reference catalog has home tiles and a vertical results sidebar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?lang=en");
  await expect(page.locator(".category-tile")).toHaveCount(11);
  await page.locator('.category-tile[href*="category=electronics"]').click();
  await expect(page).toHaveURL(/\/search\?category=electronics/);
  await expect(page.locator(".category-parent")).toHaveCount(11);
  await expect(page.locator(".category-branch li")).toHaveCount(67);
  await expect(page.locator(".category-tree")).toBeVisible();
  await expect(page.locator(".listing-card").first()).toBeVisible();
  const sidebar = await page.locator(".category-sidebar").boundingBox();
  const results = await page.locator(".search-results").boundingBox();
  expect(sidebar!.x + sidebar!.width).toBeLessThan(results!.x);
  await page.screenshot({ path: "test-results/catalog-desktop.png" });
  await page.locator('.category-branch li a[href*="category=phones"]').click();
  await expect(page.locator("h1")).toHaveText("Mobile phones & Tablets");
  await expect(page.locator('.category-tree a[aria-current="page"]')).toHaveText(
    "Mobile phones & Tablets",
  );
  await page.locator('select[name="city"]').selectOption("Prishtina");
  await page.locator('form[action="/search"] button').click();
  await expect(page).toHaveURL(/category=phones/);
  await expect(page).toHaveURL(/city=Prishtina/);
  await page.locator('.category-parent[href*="category=home"]').click();
  await expect(page).toHaveURL(/city=Prishtina/);
  await expect(page).not.toHaveURL(/attribute=/);
});

test("mobile category menu expands without horizontal overflow and legacy URLs redirect", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?category=electronics&lang=de");
  await expect(page).toHaveURL(/\/search\?category=electronics/);
  await expect(page.locator(".category-tree")).not.toBeVisible();
  await expect(page.locator(".listing-card").first()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.screenshot({ path: "test-results/catalog-mobile.png" });
  await page.locator(".category-disclosure summary").click();
  await expect(page.locator(".category-tree")).toBeVisible();
  await page.locator('.category-branch li a[href*="category=phones"]').click();
  await expect(page.locator("h1")).toHaveText("Smartphones & Tablets");
  await page.goto("/?category=tools&lang=en");
  await expect(page).toHaveURL(/category=home/);
  await expect(page.locator("h1")).toHaveText("Home & Garden");
});
