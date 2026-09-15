import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AttributeType, Prisma } from "../src/generated/prisma/client";
import { groups, definitions } from "./taxonomy";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
const locales = ["sq", "en", "de"];
async function seed(db: Prisma.TransactionClient) {
  for (const [index, group] of groups.entries()) {
    for (const item of [
      { id: group.id, names: group.names, parentId: null, sortOrder: index },
      ...group.children.map(([id, ...names], sortOrder) => ({
        id,
        names,
        parentId: group.id,
        sortOrder,
      })),
    ]) {
      await db.category.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          slug: item.id,
          parentId: item.parentId,
          icon: group.icon,
          sortOrder: item.sortOrder,
        },
        update: {
          icon: group.icon,
          parentId: item.parentId,
          sortOrder: item.sortOrder,
          active: true,
        },
      });
      for (const [i, locale] of locales.entries())
        await db.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: item.id, locale } },
          create: { categoryId: item.id, locale, name: item.names[i] },
          update: { name: item.names[i] },
        });
    }
  }
  // Consolidate only the old built-in categories; preserve listings and custom fields.
  // Everything runs in one transaction so a conflicting custom field rolls back safely.
  for (const [from, to] of [
    ["fitness", "outdoors"],
    ["hand-tools", "power-tools"],
  ]) {
    await db.attributeDefinition.updateMany({
      where: { categoryId: from },
      data: { categoryId: to },
    });
    await db.listing.updateMany({
      where: { categoryId: from },
      data: { categoryId: to, version: { increment: 1 } },
    });
    await db.category.updateMany({ where: { id: from }, data: { active: false } });
  }
  await db.category.updateMany({
    where: { parentId: "tools", active: true },
    data: { parentId: "home" },
  });
  await db.category.updateMany({ where: { id: "tools" }, data: { active: false } });
  for (const d of definitions) {
    const id = `${d.categoryId}-${d.key}`;
    const data = {
      categoryId: d.categoryId,
      key: d.key,
      type: d.type as AttributeType,
      required: d.required,
      unit: d.unit ?? null,
      min: d.min ?? null,
      max: d.max ?? null,
      options: (d.options ?? []).map((value) => ({
        value,
        labels: { en: value, sq: value, de: value },
      })),
    };
    await db.attributeDefinition.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
    for (const [i, locale] of locales.entries())
      await db.attributeTranslation.upsert({
        where: { attributeId_locale: { attributeId: id, locale } },
        create: { attributeId: id, locale, label: d.labels[i] },
        update: { label: d.labels[i] },
      });
  }
  console.log(
    `Seeded ${groups.length} category groups and ${groups.reduce((count, group) => count + group.children.length, 0)} subcategories from the reference PDF in Albanian, English and German.`,
  );
}
db.$transaction(seed, { timeout: 180000 })
  .catch(() => {
    console.error(
      "Catalog update failed and was rolled back. Check connectivity and conflicting custom field keys in legacy categories.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
