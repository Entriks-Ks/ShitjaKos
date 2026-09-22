import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { Actor, isStaff } from "@/lib/permissions";
import {
  categoryInput,
  fieldBatchInput,
  fieldInput,
} from "@/lib/validations/admin-catalog";
import { recordAudit } from "@/repositories/audit";
import { withTransaction } from "@/repositories/transaction";
import {
  createAttributeDefinition,
  createCategory,
  deleteAttributeDefinition,
  deleteCategoryWithFields,
  findAttributeDefinition,
  findCategory,
  findCategoryByEnglishName,
  findCategoryForDeletion,
  findCategoryForFields,
  findCategoryWithFamily,
  nextCategorySortOrder,
  setCategoriesActive,
} from "@/repositories/admin-catalog";

const locales = ["sq", "en", "de"] as const;

function keyOf(label: string) {
  return (
    label
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "entry"
  );
}

export async function createCatalogCategory(actor: Actor, raw: unknown) {
  if (!isStaff(actor)) throw new Error("Admin access is required.");
  const input = categoryInput.parse(raw);
  const parentId = input.parentId || null;

  return withTransaction(async (tx) => {
    const parent = parentId ? await findCategory(tx, parentId) : null;
    if (parentId && (!parent || !parent.active || parent.ownerPortal !== "SHITJAKOS")) {
      throw new Error("Choose an active category group.");
    }
    if (parent?.parentId)
      throw new Error("Categories can only have one subcategory level.");

    const duplicate = await findCategoryByEnglishName(tx, parentId, input.names.en);
    if (duplicate)
      throw new Error("A category with this English name already exists here.");

    const id = randomUUID();
    await createCategory(tx, {
      id,
      slug: `custom-${keyOf(input.names.en).replaceAll("_", "-")}-${id.slice(0, 8)}`,
      parentId,
      icon: parent?.icon ?? input.icon,
      sortOrder: await nextCategorySortOrder(tx, parentId),
      translations: locales.map((locale) => ({
        locale,
        name: input.names[locale],
      })),
    });
    await recordAudit(tx, actor.id, "category.created", id, {
      parentId,
      names: input.names,
    });
    return id;
  });
}

type ParsedField = ReturnType<typeof fieldBatchInput.parse>["fields"][number];

function preparedField(input: ParsedField) {
  const key = keyOf(input.names.en);
  const options = input.options.map((names) => ({
    value: keyOf(names.en),
    labels: names,
  }));
  if (new Set(options.map((option) => option.value)).size !== options.length) {
    throw new Error(`Field “${input.names.en}” has duplicate English choice names.`);
  }
  return { input, key, options };
}

async function createFieldsInTransaction(
  tx: Prisma.TransactionClient,
  actor: Actor,
  categoryId: string,
  inputs: ParsedField[],
) {
  const fields = inputs.map(preparedField);
  const keys = fields.map((field) => field.key);
  if (new Set(keys).size !== keys.length) {
    throw new Error("Every field in the batch needs a different English name.");
  }

  const category = await findCategoryForFields(tx, categoryId);
  if (
    !category?.active ||
    category.ownerPortal !== "SHITJAKOS" ||
    !category.parentId ||
    category.children.length
  ) {
    throw new Error("Choose an active subcategory for these fields.");
  }
  if (category._count.listings > 0 && fields.some(({ input }) => input.required)) {
    throw new Error("This subcategory already has listings. Add new fields as optional.");
  }
  const newFilters = fields.filter(
    ({ input }) => input.type === "SELECT" && input.filterable,
  ).length;
  const existingFilter = category.attributes.some(
    (attribute) => attribute.type === "SELECT" && attribute.filterable,
  );
  if (newFilters > 1 || (existingFilter && newFilters)) {
    throw new Error("A subcategory can currently have one choice filter in search.");
  }
  const existingKeys = new Set(category.attributes.map((attribute) => attribute.key));
  const duplicate = fields.find(({ key }) => existingKeys.has(key));
  if (duplicate) {
    throw new Error(`The field “${duplicate.input.names.en}” already exists here.`);
  }

  let sortOrder =
    Math.max(-1, ...category.attributes.map((field) => field.sortOrder)) + 1;
  const ids: string[] = [];
  for (const { input, key, options } of fields) {
    const id = randomUUID();
    await createAttributeDefinition(tx, {
      id,
      categoryId,
      key,
      type: input.type,
      required: input.required,
      filterable: input.filterable,
      unit: input.type === "NUMBER" ? input.unit || null : null,
      min: input.type === "NUMBER" ? input.min : null,
      max: input.type === "NUMBER" ? input.max : null,
      options,
      sortOrder: sortOrder++,
      translations: locales.map((locale) => ({
        locale,
        label: input.names[locale],
      })),
    });
    await recordAudit(tx, actor.id, "category-field.created", id, {
      categoryId,
      names: input.names,
      type: input.type,
    });
    ids.push(id);
  }
  return ids;
}

export async function createCatalogFields(actor: Actor, raw: unknown) {
  if (!isStaff(actor)) throw new Error("Admin access is required.");
  const input = fieldBatchInput.parse(raw);
  return withTransaction((tx) =>
    createFieldsInTransaction(tx, actor, input.categoryId, input.fields),
  );
}

export async function createCatalogField(actor: Actor, raw: unknown) {
  if (!isStaff(actor)) throw new Error("Admin access is required.");
  const input = fieldInput.parse(raw);
  const { categoryId, ...field } = input;
  const [id] = await createCatalogFields(actor, { categoryId, fields: [field] });
  return id;
}

export async function setCatalogCategoryActive(
  actor: Actor,
  categoryId: string,
  active: boolean,
) {
  if (!isStaff(actor)) throw new Error("Admin access is required.");
  if (!categoryId) throw new Error("Choose a category.");
  return withTransaction(async (tx) => {
    const category = await findCategoryWithFamily(tx, categoryId);
    if (!category || category.ownerPortal !== "SHITJAKOS") {
      throw new Error("Category not found.");
    }
    if (active && category.parentId && !category.parent?.active) {
      throw new Error("Restore the parent category first.");
    }
    const affectedIds = [
      category.id,
      ...(!category.parentId ? category.children.map((c) => c.id) : []),
    ];
    await setCategoriesActive(tx, affectedIds, active);
    await recordAudit(
      tx,
      actor.id,
      active ? "category.restored" : "category.archived",
      category.id,
      { affectedIds },
    );
    return affectedIds;
  });
}

export async function deleteCatalogCategory(actor: Actor, categoryId: string) {
  if (!isStaff(actor)) throw new Error("Admin access is required.");
  if (!categoryId) throw new Error("Choose a category.");
  return withTransaction(async (tx) => {
    const category = await findCategoryForDeletion(tx, categoryId);
    if (!category || category.ownerPortal !== "SHITJAKOS") {
      throw new Error("Category not found.");
    }
    if (category.children.length) {
      throw new Error("Delete or move this category’s subcategories first.");
    }
    if (category._count.listings) {
      throw new Error("This subcategory has listings. Archive it instead.");
    }
    if (category.attributes.some((field) => field._count.values > 0)) {
      throw new Error(
        "A field in this subcategory has saved answers. Archive the category instead.",
      );
    }
    await deleteCategoryWithFields(tx, categoryId);
    await recordAudit(tx, actor.id, "category.deleted", categoryId, {
      parentId: category.parentId,
      slug: category.slug,
    });
  });
}

export async function deleteCatalogField(actor: Actor, fieldId: string) {
  if (!isStaff(actor)) throw new Error("Admin access is required.");
  if (!fieldId) throw new Error("Choose a field.");
  return withTransaction(async (tx) => {
    const field = await findAttributeDefinition(tx, fieldId);
    if (!field || field.category.ownerPortal !== "SHITJAKOS") {
      throw new Error("Field not found.");
    }
    if (field._count.values) {
      throw new Error("This field has saved listing answers and cannot be deleted.");
    }
    await deleteAttributeDefinition(tx, fieldId);
    await recordAudit(tx, actor.id, "category-field.deleted", fieldId, {
      categoryId: field.categoryId,
      key: field.key,
    });
  });
}
