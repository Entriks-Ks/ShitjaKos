import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../src/lib/prisma";
import {
  createCatalogCategory,
  createCatalogField,
  createCatalogFields,
  deleteCatalogCategory,
  deleteCatalogField,
  setCatalogCategoryActive,
} from "../src/services/admin-catalog";
import { getCategories } from "../src/repositories/catalog";

// This test must never use the configured hosted database.
const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
assert.equal(target.hostname, "localhost");
assert.equal(target.port, "51214");
const db = getPrisma();
const id = randomUUID();
const actor = { id, role: "ADMIN", suspendedAt: null };
const categoryIds: string[] = [];
const labels = (name: string) => ({ sq: name, en: name, de: name });

try {
  await db.user.create({
    data: {
      id,
      name: "Catalog test",
      email: `${id}@example.test`,
      emailVerified: true,
      role: "ADMIN",
    },
  });
  await assert.rejects(
    createCatalogCategory({ ...actor, role: "USER" }, {}),
    /Admin access/,
  );
  const group = await createCatalogCategory(actor, {
    parentId: "",
    names: labels(`Test ${id}`),
    icon: "Package",
  });
  categoryIds.push(group);
  const child = await createCatalogCategory(actor, {
    parentId: group,
    names: labels("Test child"),
    icon: "Package",
  });
  categoryIds.push(child);
  await assert.rejects(
    createCatalogCategory(actor, {
      parentId: child,
      names: labels("Too deep"),
      icon: "Package",
    }),
    /one subcategory level/,
  );
  const field = {
    categoryId: child,
    names: labels("Material"),
    type: "SELECT",
    required: false,
    filterable: true,
    unit: "",
    min: null,
    max: null,
    options: [labels("Wood"), labels("Metal")],
  };
  const fieldId = await createCatalogField(actor, field);
  await assert.rejects(
    createCatalogField(actor, { ...field, categoryId: group }),
    /active subcategory/,
  );
  await assert.rejects(
    createCatalogField(actor, { ...field, names: labels("Other filter") }),
    /one choice filter/,
  );
  const batchIds = await createCatalogFields(actor, {
    categoryId: child,
    fields: [
      {
        ...field,
        names: labels("Length"),
        type: "NUMBER",
        filterable: false,
        unit: "cm",
        min: 0,
        max: 1000,
        options: [],
      },
      {
        ...field,
        names: labels("Handmade"),
        type: "BOOLEAN",
        filterable: false,
        options: [],
      },
    ],
  });
  assert.equal(batchIds.length, 2);
  const beforeFailedBatch = await db.attributeDefinition.count({
    where: { categoryId: child },
  });
  await assert.rejects(
    createCatalogFields(actor, {
      categoryId: child,
      fields: [
        { ...field, names: labels("Temporary field"), filterable: false },
        { ...field, names: labels("Temporary field"), filterable: false },
      ],
    }),
    /different English name/,
  );
  assert.equal(
    await db.attributeDefinition.count({ where: { categoryId: child } }),
    beforeFailedBatch,
  );
  const catalog = await getCategories();
  assert.equal(
    catalog.find((category) => category.id === child)?.attributes[0]?.id,
    fieldId,
  );
  assert.equal(await db.auditEvent.count({ where: { actorId: id } }), 5);
  await setCatalogCategoryActive(actor, group, false);
  assert.equal(
    await db.category.count({ where: { id: { in: [group, child] }, active: false } }),
    2,
  );
  await setCatalogCategoryActive(actor, group, true);
  assert.equal(
    await db.category.count({ where: { id: { in: [group, child] }, active: true } }),
    2,
  );
  const profile = await db.personalProfile.create({
    data: { userId: id, displayName: "Catalog test" },
  });
  const listing = await db.listing.create({
    data: {
      personalProfileId: profile.id,
      createdById: id,
      categoryId: child,
      title: "Test listing",
      description: "Temporary integration test listing",
      city: "Prishtina",
    },
  });
  await db.listingAttributeValue.create({
    data: { listingId: listing.id, attributeId: fieldId, value: "wood" },
  });
  await assert.rejects(deleteCatalogField(actor, fieldId), /saved listing answers/);
  await assert.rejects(deleteCatalogCategory(actor, child), /has listings/);
  await assert.rejects(deleteCatalogCategory(actor, group), /subcategories first/);
  await assert.rejects(
    createCatalogField(actor, {
      ...field,
      names: labels("Required detail"),
      type: "TEXT",
      required: true,
      filterable: false,
      options: [],
    }),
    /already has listings/,
  );
  const disposable = await createCatalogCategory(actor, {
    parentId: group,
    names: labels("Disposable child"),
    icon: "Package",
  });
  categoryIds.push(disposable);
  const disposableField = await createCatalogField(actor, {
    ...field,
    categoryId: disposable,
    names: labels("Disposable field"),
    filterable: false,
  });
  await deleteCatalogField(actor, disposableField);
  await deleteCatalogCategory(actor, disposable);
  categoryIds.splice(categoryIds.indexOf(disposable), 1);
  assert.equal(await db.category.findUnique({ where: { id: disposable } }), null);
  console.log(
    "Catalog integration passed: authorization, hierarchy, atomic field batches, archive/restore, safe deletion, audit, and existing-listing safeguards.",
  );
} finally {
  await db.listing.deleteMany({ where: { createdById: id } });
  await db.personalProfile.deleteMany({ where: { userId: id } });
  await db.attributeDefinition.deleteMany({ where: { categoryId: { in: categoryIds } } });
  for (const categoryId of categoryIds.reverse())
    await db.category.delete({ where: { id: categoryId } });
  await db.auditEvent.deleteMany({ where: { actorId: id } });
  await db.user.deleteMany({ where: { id } });
  await db.$disconnect();
}
