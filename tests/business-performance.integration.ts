// Explicitly run with: node --conditions=react-server --import tsx --import dotenv/config tests/business-performance.integration.ts
// All fixtures and writes roll back, including on assertion failure.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../src/lib/prisma";
import {
  performanceOwner,
  viewBusiness,
  insertPerformanceView,
  performanceTotals,
  consumePerformanceBudget,
  cleanupPerformance,
} from "../src/repositories/business-performance";
const db = getPrisma();
const rollback = new Error("ROLLBACK_SUCCESS");
try {
  await db.$transaction(
    async (tx) => {
      const [owner, staff, visitor] = [randomUUID(), randomUUID(), randomUUID()];
      for (const id of [owner, staff, visitor])
        await tx.user.create({
          data: {
            id,
            name: "Performance test",
            email: `${id}@example.test`,
            emailVerified: true,
          },
        });
      const business = await tx.business.create({
        data: {
          legalName: "Performance test",
          publicName: "Performance test",
          city: "Prishtina",
          phone: "+38344123456",
          email: `${owner}@example.test`,
          description: "Temporary transactional performance test",
          reviewStatus: "APPROVED",
          memberships: {
            create: [
              { userId: owner, role: "OWNER" },
              { userId: staff, role: "STAFF" },
            ],
          },
        },
      });
      assert.ok(await performanceOwner(tx, business.id, owner));
      assert.equal(await performanceOwner(tx, business.id, staff), null);
      assert.equal(await performanceOwner(tx, business.id, visitor), null);
      assert.equal(await viewBusiness(tx, "shop", business.id, owner), null);
      assert.equal(await viewBusiness(tx, "shop", business.id, staff), null);
      assert.ok(await viewBusiness(tx, "shop", business.id, visitor));
      assert.ok(await viewBusiness(tx, "shop", business.id, null));
      assert.equal(await viewBusiness(tx, "listing", "nonexistent", null), null);
      const data = {
        businessId: business.id,
        target: "shop",
        day: new Date("2026-09-30"),
        visitorHash: "test-digest",
      };
      await insertPerformanceView(tx, data);
      await insertPerformanceView(tx, data);
      const totals = await performanceTotals(
        tx,
        business.id,
        new Date("2026-09-30"),
        new Date("2026-10-01"),
      );
      assert.equal(totals.shopViews, 1);
      assert.equal(totals.listingViews, 0);
      assert.equal(totals.daily.length, 1);
      await insertPerformanceView(tx, { ...data, visitorHash: "guest-test-digest" });
      assert.equal(
        (
          await performanceTotals(
            tx,
            business.id,
            new Date("2026-09-30"),
            new Date("2026-10-01"),
          )
        ).shopViews,
        2,
      );
      const key = `test:${randomUUID()}`;
      assert.equal(await consumePerformanceBudget(tx, key, 2), true);
      assert.equal(await consumePerformanceBudget(tx, key, 2), true);
      assert.equal(await consumePerformanceBudget(tx, key, 2), false);
      await tx.performanceBudget.update({
        where: { key },
        data: { expiresAt: new Date("2000-01-01") },
      });
      assert.equal(await consumePerformanceBudget(tx, key, 2), true);
      await cleanupPerformance(tx, new Date("2026-10-03"));
      assert.equal(
        await tx.businessPerformanceView.count({ where: { businessId: business.id } }),
        0,
      );
      assert.equal(
        (
          await performanceTotals(
            tx,
            business.id,
            new Date("2026-09-30"),
            new Date("2026-10-01"),
          )
        ).shopViews,
        2,
      );
      await tx.business.update({
        where: { id: business.id },
        data: { suspendedAt: new Date() },
      });
      assert.equal(await performanceOwner(tx, business.id, owner), null);
      assert.equal(await viewBusiness(tx, "shop", business.id, visitor), null);
      throw rollback;
    },
    { timeout: 30000 },
  );
} catch (error) {
  if (error !== rollback) throw error;
  console.log(
    "Performance integration passed: owner access, staff/outsider denial, own-visit exclusion, deduplication, UTC totals and suspension. All fixtures rolled back.",
  );
} finally {
  await db.$disconnect();
}
