import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import sharp from "sharp";

// This suite writes only fixtures to the isolated local database. It sends no email.
test.skip(
  process.env.PERF_LOCAL !== "1",
  "Requires an isolated local production server.",
);
test.use({ baseURL: process.env.PERF_BASE_URL ?? "http://localhost:3002" });

test("client navigation, single-action updates, cache invalidation, and protected photo caching", async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  test.setTimeout(180000);
  const target = new URL(process.env.DATABASE_URL!);
  assert.equal(target.hostname, "localhost");
  assert.equal(target.port, "51214");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 2 }),
  });
  const id = randomUUID();
  const groupId = randomUUID();
  const categoryId = randomUUID();
  const key = `${id}.webp`;
  const email = `${id}@example.test`;
  const password = "Local-performance-test-5839!";
  const anonymous = await browser.newContext({ baseURL });
  const publicPage = await anonymous.newPage();
  let extraCategoryId: string | undefined;
  try {
    const user = await db.user.create({
      data: {
        id,
        name: "Performance tester",
        email,
        emailVerified: true,
        role: "ADMIN",
        profile: { create: { displayName: "Performance seller" } },
        accounts: {
          create: {
            id: randomUUID(),
            providerId: "credential",
            accountId: id,
            password: await hashPassword(password),
          },
        },
      },
      include: { profile: true },
    });
    await db.category.create({
      data: {
        id: groupId,
        slug: groupId,
        translations: { create: [{ locale: "en", name: `Perf group ${id}` }] },
      },
    });
    await db.category.create({
      data: {
        id: categoryId,
        slug: categoryId,
        parentId: groupId,
        translations: { create: [{ locale: "en", name: "Perf subcategory" }] },
      },
    });
    const listing = await db.listing.create({
      data: {
        personalProfileId: user.profile!.id,
        createdById: id,
        categoryId,
        title: `Performance listing ${id}`,
        description: "Temporary listing for browser performance verification.",
        city: "Prishtina",
        status: "PUBLISHED",
        moderationStatus: "APPROVED",
        publishedAt: new Date(),
        media: { create: { storageKey: key, position: 0, altText: "Test photo" } },
      },
      include: { media: true },
    });
    await mkdir(join(process.cwd(), ".uploads"), { recursive: true });
    await writeFile(
      join(process.cwd(), ".uploads", key),
      await sharp({
        create: { width: 1200, height: 900, channels: 3, background: "#315e43" },
      })
        .webp()
        .toBuffer(),
    );

    await publicPage.goto("/?lang=en");
    await expect(publicPage.locator(".searchbar")).toBeVisible();
    // A property on window disappears on document navigation, but survives client navigation.
    await publicPage.evaluate(() => {
      Object.assign(window, { performanceNavigationMarker: "kept" });
    });
    await publicPage.locator('input[name="q"]').fill(id);
    await publicPage.locator(".searchbar button").click();
    await expect(publicPage).toHaveURL(/\/search\?/);
    await expect(
      publicPage.locator(".listing-card").filter({ hasText: listing.title }),
    ).toBeVisible();
    expect(
      await publicPage.evaluate(() => Reflect.get(window, "performanceNavigationMarker")),
    ).toBe("kept");
    await publicPage.locator('select[name="city"]').selectOption("Prishtina");
    await publicPage.locator('form[action="/search"] button').click();
    await expect(publicPage).toHaveURL(/city=Prishtina/);
    expect(
      await publicPage.evaluate(() => Reflect.get(window, "performanceNavigationMarker")),
    ).toBe("kept");
    await publicPage.goBack();
    await expect(publicPage.locator('select[name="city"]')).toHaveValue("");

    const imageUrl = `/api/media/${listing.media[0].id}?size=thumb`;
    const photo = await anonymous.request.get(imageUrl);
    expect(photo.status()).toBe(200);
    expect((await sharp(await photo.body()).metadata()).width).toBeLessThanOrEqual(480);
    const etag = photo.headers().etag;
    expect(etag).toBeTruthy();
    expect(
      (
        await anonymous.request.get(imageUrl, { headers: { "if-none-match": etag } })
      ).status(),
    ).toBe(304);

    const signedIn = await context.request.post("/api/auth/sign-in/email", {
      headers: { origin: baseURL! },
      data: { email, password },
    });
    expect(signedIn.status()).toBe(200);
    await page.goto("/dashboard");
    const row = page.locator(".account-listing").filter({ hasText: listing.title });
    await expect(row).toBeVisible();
    await page.waitForLoadState("networkidle");
    const actionRequests: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" ||
        (request.headers().rsc === "1" && !request.headers()["next-router-prefetch"])
      )
        actionRequests.push(request.method());
    });
    await row.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(row.getByText("Paused", { exact: true })).toBeVisible();
    expect(actionRequests).toEqual(["POST"]);
    // A previously public cached photo cannot bypass a fresh visibility check.
    expect(
      (
        await anonymous.request.get(imageUrl, { headers: { "if-none-match": etag } })
      ).status(),
    ).toBe(404);
    const privatePhoto = await context.request.get(imageUrl, {
      headers: { "if-none-match": etag },
    });
    expect(privatePhoto.status()).toBe(200);
    expect(privatePhoto.headers()["cache-control"]).toContain("no-store");
    await row.getByRole("button", { name: "Publish listing" }).click();
    await expect(row.getByText("Published", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Personal details", exact: true }).click();
    await page.getByLabel("Your name", { exact: true }).fill("Updated tester");
    await page.getByLabel("Phone number", { exact: false }).fill("+383 44 123 456");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Profile saved" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Overview", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hello, Updated." })).toBeVisible();
    await page.getByRole("link", { name: "My shops", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "My shops", exact: true }),
    ).toBeVisible();

    await page.goto("/admin/catalog");
    await page.getByText("Add a category or subcategory", { exact: true }).click();
    const createForm = page
      .locator("form")
      .filter({ has: page.getByRole("button", { name: "Add category", exact: true }) });
    for (const language of ["Albanian", "English", "German"])
      await createForm.getByLabel(language, { exact: true }).fill(`Cache test ${id}`);
    await createForm.getByRole("button", { name: "Add category", exact: true }).click();
    await expect(
      page.locator(".catalog-group summary").filter({ hasText: `Cache test ${id}` }),
    ).toBeVisible();
    extraCategoryId = (
      await db.category.findFirstOrThrow({
        where: { translations: { some: { locale: "en", name: `Cache test ${id}` } } },
      })
    ).id;
    await publicPage.goto("/?lang=en");
    await expect(
      publicPage.locator(".category-tile").filter({ hasText: `Cache test ${id}` }),
    ).toBeVisible();

    await page.screenshot({ path: "test-results/performance-admin.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/performance-dashboard-mobile.png",
      fullPage: true,
    });
    await db.user.update({ where: { id }, data: { role: "USER" } });
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "This page is not available." }),
    ).toBeVisible();
    await db.user.update({ where: { id }, data: { suspendedAt: new Date() } });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
    expect(
      (
        await anonymous.request.get(imageUrl, { headers: { "if-none-match": etag } })
      ).status(),
    ).toBe(404);
  } finally {
    await anonymous.close();
    await db.listing.deleteMany({ where: { createdById: id } });
    await db.personalProfile.deleteMany({ where: { userId: id } });
    await db.auditEvent.deleteMany({ where: { actorId: id } });
    await db.user.deleteMany({ where: { id } });
    await db.category.deleteMany({ where: { id: categoryId } });
    await db.category.deleteMany({
      where: {
        OR: [
          { id: { in: [groupId, ...(extraCategoryId ? [extraCategoryId] : [])] } },
          { translations: { some: { locale: "en", name: `Cache test ${id}` } } },
        ],
      },
    });
    await unlink(join(process.cwd(), ".uploads", key)).catch(() => {});
    await unlink(join(process.cwd(), ".uploads", "thumbnails", key)).catch(() => {});
    await db.$disconnect();
  }
});
