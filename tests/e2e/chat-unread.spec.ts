import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

test("active chat stays read while scrolled-up chat remains unread", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const check = expect.configure({ timeout: 60_000 });
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
  });
  const [buyerId, sellerId, conversationId] = [randomUUID(), randomUUID(), randomUUID()];
  const otherConversationId = randomUUID();
  const ids = [buyerId, sellerId];
  const password = `Test-${randomUUID()}!`;
  const recipient = await browser.newContext();
  const sender = await browser.newContext();
  try {
    const hash = await hashPassword(password);
    for (const id of ids)
      await db.user.create({
        data: {
          id,
          name: "Chat test",
          email: `${id}@example.test`,
          emailVerified: true,
          profile: { create: { displayName: "Chat test" } },
          accounts: {
            create: {
              id: randomUUID(),
              accountId: id,
              providerId: "credential",
              password: hash,
            },
          },
        },
      });
    await db.conversation.create({
      data: {
        id: conversationId,
        buyerId,
        sellerUserId: sellerId,
        sellerKind: "PERSONAL",
        sourceListingId: randomUUID(),
        listingTitle: "Temporary chat test",
        sellerName: "Chat test",
        lastSequence: 30,
        messages: {
          create: Array.from({ length: 30 }, (_, i) => ({
            sequence: i + 1,
            senderId: buyerId,
            senderSide: "BUYER",
            clientId: randomUUID(),
            createdAt: new Date(Date.now() - 86_400_000),
            body: `Earlier message ${i + 1}\nEnough message history to exercise scrolling.`,
          })),
        },
      },
    });
    for (const [context, id] of [
      [recipient, sellerId],
      [sender, buyerId],
    ] as const) {
      const login = await context.request.post(
        "http://localhost:3001/api/auth/sign-in/email",
        {
          timeout: 45_000,
          headers: { origin: "http://localhost:3001" },
          data: { email: `${id}@example.test`, password },
        },
      );
      expect(login.status()).toBe(200);
    }
    const page = await recipient.newPage();
    await page.goto(`http://localhost:3001/dashboard/messages/${conversationId}`);
    await page.bringToFront();
    await page.getByRole("textbox", { name: "Your message" }).fill("Typing a reply");
    await expect
      .poll(
        async () =>
          (
            await db.conversationReadState.findUnique({
              where: { conversationId_userId: { conversationId, userId: sellerId } },
            })
          )?.lastSequence,
      )
      .toBe(30);
    const badge = page.locator('[aria-label$="unread messages"]');
    await expect(badge).toHaveCount(0);
    await page.evaluate(() => {
      const state = window as typeof window & { unreadFlashed?: boolean };
      state.unreadFlashed = false;
      new MutationObserver(() => {
        if (document.querySelector('[aria-label$="unread messages"]'))
          state.unreadFlashed = true;
      }).observe(document.body, { subtree: true, childList: true, attributes: true });
    });
    async function send(body: string, targetId = conversationId) {
      const result = await sender.request.post(
        `http://localhost:3001/api/v1/conversations/${targetId}/messages`,
        {
          headers: { origin: "http://localhost:3001" },
          data: { body, clientId: randomUUID() },
        },
      );
      expect(result.status()).toBe(201);
    }
    await send("Incoming while typing");
    await check(page.getByText("Incoming while typing", { exact: true })).toBeVisible();
    await check
      .poll(
        async () =>
          (
            await db.conversationReadState.findUnique({
              where: { conversationId_userId: { conversationId, userId: sellerId } },
            })
          )?.lastSequence,
      )
      .toBe(31);
    await expect(badge).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as typeof window & { unreadFlashed?: boolean }).unreadFlashed,
      ),
    ).toBe(false);
    // Model a visible browser window with keyboard focus elsewhere. Merely
    // selecting a different element would leave document.hasFocus() true.
    await page.getByText("Incoming while typing", { exact: true }).click();
    await page.getByRole("region", { name: "Message history" }).evaluate((node) => {
      node.scrollTop = node.scrollHeight;
      node.dispatchEvent(new Event("scroll"));
    });
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      Object.defineProperty(document, "hasFocus", {
        configurable: true,
        value: () => false,
      });
      window.dispatchEvent(new Event("blur"));
    });
    expect(await page.evaluate(() => document.visibilityState)).toBe("visible");
    expect(
      await page
        .getByRole("region", { name: "Message history" })
        .evaluate((node) => node.scrollHeight - node.scrollTop - node.clientHeight),
    ).toBeLessThan(50);
    await send("Incoming while just reading");
    await check(
      page.getByText("Incoming while just reading", { exact: true }),
    ).toBeVisible();
    await check
      .poll(
        async () =>
          (
            await db.conversationReadState.findUnique({
              where: { conversationId_userId: { conversationId, userId: sellerId } },
            })
          )?.lastSequence,
      )
      .toBe(32);
    await expect(badge).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as typeof window & { unreadFlashed?: boolean }).unreadFlashed,
      ),
    ).toBe(false);
    await page.getByRole("region", { name: "Message history" }).evaluate((node) => {
      node.scrollTop = 0;
      node.dispatchEvent(new Event("scroll"));
    });
    await send("Incoming while scrolled up");
    await check(badge.first()).toBeVisible();
    expect(
      (
        await db.conversationReadState.findUnique({
          where: { conversationId_userId: { conversationId, userId: sellerId } },
        })
      )?.lastSequence,
    ).toBe(32);
    await check(
      page.getByText("Incoming while scrolled up", { exact: true }),
    ).toBeAttached();
    await page.getByRole("region", { name: "Message history" }).evaluate((node) => {
      node.scrollTop = node.scrollHeight;
      node.dispatchEvent(new Event("scroll"));
    });
    await check
      .poll(
        async () =>
          (
            await db.conversationReadState.findUnique({
              where: { conversationId_userId: { conversationId, userId: sellerId } },
            })
          )?.lastSequence,
      )
      .toBe(33);
    await check(badge).toHaveCount(0);

    await db.conversation.create({
      data: {
        id: otherConversationId,
        buyerId,
        sellerUserId: sellerId,
        sellerKind: "PERSONAL",
        sourceListingId: randomUUID(),
        listingTitle: "Other temporary chat",
        sellerName: "Chat test",
      },
    });
    await send("Message in a different chat", otherConversationId);
    await check(badge.first()).toBeVisible();
    const summary = await recipient.request.get(
      `http://localhost:3001/api/v1/notifications?readingConversationId=${conversationId}`,
    );
    expect(summary.status()).toBe(200);
    const data = await summary.json();
    expect(data.unread).toBe(1);
    expect(data.latest.conversationId).toBe(otherConversationId);
  } finally {
    await recipient.close();
    await sender.close();
    await db.messageReport.deleteMany({ where: { conversationId } });
    await db.conversation.deleteMany({
      where: { id: { in: [conversationId, otherConversationId] } },
    });
    await db.auditEvent.deleteMany({ where: { actorId: { in: ids } } });
    await db.personalProfile.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
});
