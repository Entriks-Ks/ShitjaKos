import "dotenv/config";
import { test, expect, type Browser, type BrowserContext } from "@playwright/test";
import { readdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const baseURL = "http://localhost:3001";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 2 }),
});
const run = randomUUID().slice(0, 8);
const emails: string[] = [];
const contexts: BrowserContext[] = [];

async function account(browser: Browser, name: string) {
  const email = `e2e-${run}-${name}@example.test`.toLowerCase();
  emails.push(email);
  const context = await browser.newContext({ baseURL });
  contexts.push(context);
  const signup = () =>
    context.request.post("/api/auth/sign-up/email", {
      headers: { origin: baseURL },
      data: { email, name, password: "A-test-password-8327!", callbackURL: "/dashboard" },
    });
  let response = await signup();
  if (response.status() === 429) {
    await new Promise((resolve) => setTimeout(resolve, 60000));
    response = await signup();
  }
  expect(response.status(), await response.text()).toBe(200);
  let verificationUrl = "";
  await expect(async () => {
    for (const file of await readdir(".local-mail")) {
      const text = await readFile(join(".local-mail", file), "utf8");
      if (text.includes(`To: ${email}`))
        verificationUrl = text.match(/https?:\/\/\S+/)?.[0] ?? "";
    }
    expect(verificationUrl).not.toBe("");
  }).toPass({ timeout: 10000 });
  const page = await context.newPage();
  await page.goto(verificationUrl);
  await expect(page).toHaveURL(/dashboard/);
  return { context, page, email };
}

test.afterAll(async () => {
  // Remove only records belonging to this test's randomly named accounts.
  const users = await db.user.findMany({ where: { email: { in: emails } } });
  const ids = users.map((u) => u.id);
  const memberships = await db.businessMembership.findMany({
    where: { userId: { in: ids } },
  });
  const businessIds = memberships.map((m) => m.businessId);
  const listingIds = (
    await db.listing.findMany({ where: { createdById: { in: ids } } })
  ).map((l) => l.id);
  const media = await db.listingMedia.findMany({
    where: { listingId: { in: listingIds } },
  });
  await db.auditEvent.deleteMany({ where: { actorId: { in: ids } } });
  await db.listing.deleteMany({ where: { id: { in: listingIds } } });
  await db.shop.deleteMany({ where: { businessId: { in: businessIds } } });
  await db.businessMembership.deleteMany({ where: { businessId: { in: businessIds } } });
  await db.business.deleteMany({ where: { id: { in: businessIds } } });
  await db.personalProfile.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  for (const item of media)
    await unlink(join(".uploads", item.storageKey)).catch(() => {});
  for (const file of await readdir(".local-mail")) {
    const text = await readFile(join(".local-mail", file), "utf8");
    if (emails.some((email) => text.includes(`To: ${email}`)))
      await unlink(join(".local-mail", file));
  }
  for (const context of contexts) await context.close();
  await db.$disconnect();
});

test("verified accounts, ownership, category validation, reviews, personal/business inventory and search", async ({
  browser,
}) => {
  test.setTimeout(240000);
  const seller = await account(browser, "Seller");
  const admin = await account(browser, "Reviewer");
  const outsider = await account(browser, "Outsider");
  await db.user.update({ where: { email: admin.email }, data: { role: "ADMIN" } });

  await seller.page.goto("/listings/new");
  await seller.page.getByLabel("Category", { exact: true }).selectOption("phones");
  await seller.page.getByLabel("Title", { exact: true }).fill(`Test phone ${run}`);
  await seller.page
    .getByLabel("Description", { exact: true })
    .fill("A carefully maintained phone with a charger. Available for local collection.");
  await seller.page.getByLabel("Brand").selectOption("Apple");
  await seller.page.getByLabel("Storage").fill("256");
  await seller.page.getByLabel("Model", { exact: false }).fill("15 Pro");
  await seller.page.getByLabel("Price / wanted budget").fill("499");
  expect(
    await seller.page.locator("form").evaluate((form) =>
      Array.from(form.querySelectorAll("input,select,textarea"))
        .filter((element) => !(element as HTMLInputElement).checkValidity())
        .map((element) => ({
          name: element.getAttribute("name"),
          label: element.getAttribute("aria-label"),
          message: (element as HTMLInputElement).validationMessage,
          value: (element as HTMLInputElement).value,
        })),
    ),
  ).toEqual([]);
  await seller.page.getByRole("button", { name: "Save draft & add photos" }).click();
  await expect(seller.page).toHaveURL(/\/listings\/[^/]+\/edit/);
  const listingId = seller.page.url().split("/").at(-2)!;
  const image = await sharp({
    create: { width: 500, height: 400, channels: 3, background: "#a1b8b0" },
  })
    .png()
    .toBuffer();
  await expect(seller.page.getByLabel("Add photos")).toBeEnabled();
  await seller.page
    .getByLabel("Add photos")
    .setInputFiles({ name: "phone.png", mimeType: "image/png", buffer: image });
  await expect(seller.page.getByRole("button", { name: "Remove photo 1" })).toBeVisible();
  await seller.page.getByRole("button", { name: "Publish listing" }).click();
  await expect(
    seller.page.getByText("Status: PUBLISHED", { exact: false }),
  ).toBeVisible();

  await outsider.page.goto(`/listings/${listingId}/edit`);
  await expect(
    outsider.page.getByRole("heading", { name: "This page is not available." }),
  ).toBeVisible();
  const photo = await db.listingMedia.findFirstOrThrow({ where: { listingId } });
  expect((await outsider.context.request.get(`/api/media/${photo.id}`)).status()).toBe(
    200,
  );
  const tampered = await outsider.context.request.post(
    `/api/listings/${listingId}/media`,
    {
      headers: { origin: baseURL },
      multipart: { file: { name: "image.png", mimeType: "image/png", buffer: image } },
    },
  );
  expect(tampered.status()).toBe(403);
  await outsider.page.goto(`/?q=${run}&lang=en`);
  await expect(
    outsider.page.getByRole("heading", { name: `Test phone ${run}` }),
  ).toBeVisible();

  await outsider.page.goto(`/?q=${run}&seller=private&lang=en`);
  await expect(
    outsider.page.getByRole("heading", { name: `Test phone ${run}` }),
  ).toBeVisible();
  await outsider.page.goto(`/?q=${run}&seller=business&lang=en`);
  await expect(
    outsider.page.getByRole("heading", { name: `Test phone ${run}` }),
  ).toHaveCount(0);
  await outsider.page.goto(
    `/?q=${run}&category=phones&attribute=phones-brand&value=Samsung&lang=en`,
  );
  await expect(
    outsider.page.getByRole("heading", { name: `Test phone ${run}` }),
  ).toHaveCount(0);
  await outsider.page.goto(`/listings/${listingId}?lang=en`);
  await expect(
    outsider.page.getByText("The seller has not shared a public phone number."),
  ).toBeVisible();

  await seller.page.goto("/business/new");
  await seller.page.getByLabel("Registered legal name").fill(`Test Legal ${run}`);
  await seller.page.getByLabel("Public shop name").fill(`Test Shop ${run}`);
  await seller.page.getByLabel("Public email").fill(seller.email);
  await seller.page.getByLabel("Public phone").fill("+38344123456");
  await seller.page
    .getByLabel("About your business")
    .fill("A local shop selling carefully selected home and electronic products.");
  await seller.page
    .getByRole("button", { name: "Create business & request review" })
    .click();
  await expect(seller.page).toHaveURL(/dashboard/);
  const business = await db.business.findFirstOrThrow({
    where: { publicName: `Test Shop ${run}` },
    include: { shop: true },
  });
  expect(
    await db.personalProfile.count({ where: { user: { email: seller.email } } }),
  ).toBe(1);
  expect(business.reviewStatus).toBe("PENDING");
  await admin.page.goto("/admin");
  const businessReview = admin.page
    .locator("article")
    .filter({ hasText: `Test Shop ${run}` });
  await businessReview
    .getByLabel("Review reason")
    .fill("Business details reviewed for test acceptance.");
  await businessReview.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(businessReview).toHaveCount(0);

  await seller.page.goto("/listings/new");
  await seller.page.getByLabel("Publish as").selectOption(business.id);
  await seller.page.getByLabel("Category", { exact: true }).selectOption("furniture");
  await seller.page.getByLabel("Title", { exact: true }).fill(`Test chair ${run}`);
  await seller.page
    .getByLabel("Description", { exact: true })
    .fill("Solid wooden chair from our local shop. Available for collection.");
  await seller.page.getByLabel("Material", { exact: false }).selectOption("Wood");
  await seller.page.getByLabel("Price / wanted budget").fill("49");
  await seller.page.getByRole("button", { name: "Save draft & add photos" }).click();
  await expect(seller.page).toHaveURL(/\/edit/);
  const businessListingId = seller.page.url().split("/").at(-2)!;
  const businessListing = await db.listing.findUniqueOrThrow({
    where: { id: businessListingId },
  });
  expect(businessListing.businessId).toBe(business.id);
  expect(businessListing.personalProfileId).toBeNull();
  await seller.page
    .getByLabel("Add photos")
    .setInputFiles({ name: "chair.png", mimeType: "image/png", buffer: image });
  await expect(seller.page.getByRole("button", { name: "Remove photo 1" })).toBeVisible();
  await seller.page.getByRole("button", { name: "Publish listing" }).click();
  await expect(
    seller.page.getByText("Status: PUBLISHED", { exact: false }),
  ).toBeVisible();
  await outsider.page.goto(`/?q=${run}&seller=business&lang=en`);
  await expect(
    outsider.page.getByRole("heading", { name: `Test chair ${run}` }),
  ).toBeVisible();
  await expect(
    outsider.page.getByRole("heading", { name: `Test phone ${run}` }),
  ).toHaveCount(0);
  await outsider.page.goto(`/shops/${business.shop!.slug}?lang=en`);
  await expect(
    outsider.page.getByRole("heading", { name: `Test chair ${run}` }),
  ).toBeVisible();
  await expect(
    outsider.page.getByRole("heading", { name: `Test phone ${run}` }),
  ).toHaveCount(0);
  await outsider.page.setViewportSize({ width: 390, height: 844 });
  await outsider.page.goto(`/?q=${run}&lang=en`);
  expect(
    await outsider.page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await outsider.page.screenshot({
    path: "test-results/marketplace-mobile.png",
    fullPage: true,
  });
  await outsider.page.setViewportSize({ width: 1440, height: 1000 });
  await outsider.page.screenshot({
    path: "test-results/marketplace-desktop.png",
    fullPage: true,
  });

  await seller.page.goto("/dashboard");
  const ownPhone = seller.page
    .locator("article")
    .filter({ hasText: `Test phone ${run}` });
  await ownPhone.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(ownPhone.getByText("Paused", { exact: true })).toBeVisible();
  await outsider.page.goto(`/?q=${run}&seller=private&lang=en`);
  await expect(
    outsider.page.getByRole("heading", { name: `Test phone ${run}` }),
  ).toHaveCount(0);

  await db.user.update({
    where: { email: seller.email },
    data: { suspendedAt: new Date() },
  });
  await seller.page.goto("/listings/new");
  await expect(seller.page).toHaveURL(/login/);
  await outsider.page.goto("/admin");
  await expect(
    outsider.page.getByRole("heading", { name: "This page is not available." }),
  ).toBeVisible();
});
