import "server-only";
import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { Actor, isStaff } from "@/lib/permissions";
import { categoryInput, fieldInput } from "@/lib/validations/admin-catalog";

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

  return getPrisma().$transaction(async (tx) => {
    const parent = parentId
      ? await tx.category.findUnique({ where: { id: parentId } })
      : null;
    if (parentId && (!parent || !parent.active || parent.ownerPortal !== "SHITJAKOS")) {
      throw new Error("Choose an active category group.");
    }
    if (parent?.parentId)
      throw new Error("Categories can only have one subcategory level.");

    const duplicate = await tx.category.findFirst({
      where: {
        parentId,
        ownerPortal: "SHITJAKOS",
        translations: { some: { locale: "en", name: input.names.en } },
      },
    });
    if (duplicate)
      throw new Error("A category with this English name already exists here.");

    const position = await tx.category.aggregate({
      where: { parentId, ownerPortal: "SHITJAKOS" },
      _max: { sortOrder: true },
    });
    const id = randomUUID();
    const slug = `custom-${keyOf(input.names.en).replaceAll("_", "-")}-${id.slice(0, 8)}`;
    await tx.category.create({
      data: {
        id,
        slug,
        parentId,
        ownerPortal: "SHITJAKOS",
        icon: parent?.icon ?? input.icon,
        sortOrder: (position._max.sortOrder ?? -1) + 1,
        translations: {
          create: locales.map((locale) => ({ locale, name: input.names[locale] })),
        },
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: actor.id,
        action: "category.created",
        targetId: id,
        detail: { parentId, names: input.names },
      },
    });
    return id;
  });
}

export async function createCatalogField(actor: Actor, raw: unknown) {
  if (!isStaff(actor)) throw new Error("Admin access is required.");
  const input = fieldInput.parse(raw);
  const key = keyOf(input.names.en);
  const options = input.options.map((names) => ({
    value: keyOf(names.en),
    labels: names,
  }));
  if (new Set(options.map((option) => option.value)).size !== options.length) {
    throw new Error("Each choice needs a different English name.");
  }

  return getPrisma().$transaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: { id: input.categoryId },
      include: {
        children: true,
        attributes: true,
        _count: { select: { listings: true } },
      },
    });
    if (
      !category?.active ||
      category.ownerPortal !== "SHITJAKOS" ||
      !category.parentId ||
      category.children.length
    ) {
      throw new Error("Choose an active subcategory for this field.");
    }
    if (input.required && category._count.listings > 0) {
      throw new Error(
        "This subcategory already has listings. Add a new field as optional.",
      );
    }
    if (
      input.filterable &&
      category.attributes.some(
        (attribute) => attribute.type === "SELECT" && attribute.filterable,
      )
    ) {
      throw new Error("This subcategory already has a choice filter in search.");
    }
    const existing = await tx.attributeDefinition.findUnique({
      where: { categoryId_key: { categoryId: input.categoryId, key } },
    });
    if (existing) throw new Error("A field with this English name already exists here.");

    const position = await tx.attributeDefinition.aggregate({
      where: { categoryId: input.categoryId },
      _max: { sortOrder: true },
    });
    const id = randomUUID();
    await tx.attributeDefinition.create({
      data: {
        id,
        categoryId: input.categoryId,
        key,
        type: input.type,
        required: input.required,
        filterable: input.filterable,
        unit: input.type === "NUMBER" ? input.unit || null : null,
        min: input.type === "NUMBER" ? input.min : null,
        max: input.type === "NUMBER" ? input.max : null,
        options,
        sortOrder: (position._max.sortOrder ?? -1) + 1,
        translations: {
          create: locales.map((locale) => ({ locale, label: input.names[locale] })),
        },
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: actor.id,
        action: "category-field.created",
        targetId: id,
        detail: { categoryId: input.categoryId, names: input.names, type: input.type },
      },
    });
    return id;
  });
}
