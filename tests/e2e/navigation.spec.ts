import { test, expect } from "@playwright/test";

test.use({ baseURL: process.env.NAV_BASE_URL ?? "http://localhost:3001" });

test("slow navigation keeps the page visible and shows a compact progress bar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?lang=en");
  await expect(page.locator(".hero")).toBeVisible();
  await page.evaluate(() => Object.assign(window, { navigationMarker: "preserved" }));

  // Hold each destination response so the intermediate UI can be inspected.
  await page.route("**/search?**", async (route) => {
    if (route.request().headers().rsc === "1") {
      await new Promise((resolve) => setTimeout(resolve, 1800));
    }
    await route.continue();
  });
  await page.locator('.searchbar input[name="q"]').fill("phone");
  const searchClick = page.locator(".searchbar button").click();
  await expect(page.locator(".navigation-progress")).toBeVisible();
  await expect(page.locator(".hero")).toBeVisible();
  await expect(page.locator(".site-header")).toBeVisible();
  expect((await page.locator(".navigation-progress").boundingBox())!.height).toBe(3);
  await page.screenshot({ path: "test-results/navigation-search-pending.png" });
  await searchClick;
  await expect(page.locator(".search-results")).toBeVisible();
  await expect(page.locator(".navigation-progress")).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, "navigationMarker"))).toBe(
    "preserved",
  );

  await page.route("**/shops?**", async (route) => {
    if (route.request().headers().rsc === "1") {
      await new Promise((resolve) => setTimeout(resolve, 1800));
    }
    await route.continue();
  });
  const shopClick = page.locator('.site-header a[href="/shops?lang=en"]').first().click();
  await expect(page.locator(".navigation-progress")).toBeVisible();
  await expect(page.locator(".search-results")).toBeVisible();
  await expect(page.locator(".site-header")).toBeVisible();
  await page.screenshot({ path: "test-results/navigation-link-pending.png" });
  await shopClick;
  await expect(page).toHaveURL(/\/shops\?lang=en/);
  await expect(page.locator(".navigation-progress")).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, "navigationMarker"))).toBe(
    "preserved",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?lang=en");
  await expect(page.locator(".hero")).toBeVisible();
  await page.locator('.searchbar input[name="q"]').fill("phone");
  const mobileClick = page.locator(".searchbar button").click();
  await expect(page.locator(".navigation-progress")).toBeVisible();
  await expect(page.locator(".hero")).toBeVisible();
  expect(
    await page
      .locator(".navigation-progress-bar")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.screenshot({ path: "test-results/navigation-mobile-pending.png" });
  await mobileClick;
  await expect(page.locator(".search-results")).toBeVisible();
  await expect(page.locator(".navigation-progress")).toHaveCount(0);
});
