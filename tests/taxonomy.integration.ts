import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { groups } from "../prisma/taxonomy";

const url = process.env.DATABASE_URL!;
if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("Use an isolated local database.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1 }) });
const id = `taxonomy-test-${randomUUID()}`;
try {
  await db.category.upsert({
    where: { id: "hand-tools" },
    create: { id: "hand-tools", slug: "hand-tools" },
    update: {},
  });
  await db.user.create({
    data: {
      id,
      name: "Taxonomy test",
      email: `${id}@example.invalid`,
      profile: { create: { id, displayName: "Taxonomy test" } },
    },
  });
  await db.listing.create({
    data: {
      id,
      createdById: id,
      personalProfileId: id,
      categoryId: "hand-tools",
      title: "Test hand tool",
      description: "Catalog migration preservation test",
      city: "Peja",
      condition: "USED",
    },
  });
  await db.attributeDefinition.create({
    data: {
      id,
      categoryId: "hand-tools",
      key: id,
      type: "TEXT",
      required: false,
      options: [],
    },
  });
  await db.listingAttributeValue.create({
    data: { listingId: id, attributeId: id, value: "Keep this answer" },
  });
  const count = await db.listing.count();
  for (let run = 0; run < 2; run++) {
    execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], {
      stdio: "pipe",
      env: process.env,
    });
    assert.equal(await db.listing.count(), count);
    const listing = await db.listing.findUniqueOrThrow({
      where: { id },
      include: { attributes: { include: { attribute: true } } },
    });
    assert.equal(listing.categoryId, "power-tools");
    assert.equal(listing.attributes[0].value, "Keep this answer");
    assert.equal(listing.attributes[0].attribute.categoryId, listing.categoryId);
  }
  assert.equal(groups.length, 11);
  assert.equal(
    groups.reduce((sum, group) => sum + group.children.length, 0),
    67,
  );
  for (const group of groups) {
    const rows = await db.category.findMany({
      where: { parentId: group.id, active: true },
    });
    for (const [childId] of group.children)
      assert.ok(rows.some((row) => row.id === childId));
  }
  console.log(
    "Catalog migration preserves listings and field answers; repeat seed is safe; all 11 groups and 67 subcategories present.",
  );
} finally {
  await db.listing.deleteMany({ where: { id } });
  await db.attributeDefinition.deleteMany({ where: { id } });
  await db.personalProfile.deleteMany({ where: { id } });
  await db.user.deleteMany({ where: { id } });
  await db.$disconnect();
}
