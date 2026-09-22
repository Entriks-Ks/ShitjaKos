import "server-only";
import type { Prisma } from "@/generated/prisma/client";

const PORTAL = "SHITJAKOS" as const;

export type CategoryTranslationWrite = { locale: string; name: string };
export type FieldTranslationWrite = { locale: string; label: string };

export function findCategory(tx: Prisma.TransactionClient, id: string) {
  return tx.category.findUnique({ where: { id } });
}

export function findCategoryWithFamily(tx: Prisma.TransactionClient, id: string) {
  return tx.category.findUnique({
    where: { id },
    include: { parent: true, children: true },
  });
}

export function findCategoryForFields(tx: Prisma.TransactionClient, id: string) {
  return tx.category.findUnique({
    where: { id },
    include: {
      children: true,
      attributes: true,
      _count: { select: { listings: true } },
    },
  });
}

export function findCategoryForDeletion(tx: Prisma.TransactionClient, id: string) {
  return tx.category.findUnique({
    where: { id },
    include: {
      children: true,
      attributes: { include: { _count: { select: { values: true } } } },
      _count: { select: { listings: true } },
    },
  });
}

export function findCategoryByEnglishName(
  tx: Prisma.TransactionClient,
  parentId: string | null,
  name: string,
) {
  return tx.category.findFirst({
    where: {
      parentId,
      ownerPortal: PORTAL,
      translations: { some: { locale: "en", name } },
    },
  });
}

export async function nextCategorySortOrder(
  tx: Prisma.TransactionClient,
  parentId: string | null,
) {
  const position = await tx.category.aggregate({
    where: { parentId, ownerPortal: PORTAL },
    _max: { sortOrder: true },
  });
  return (position._max.sortOrder ?? -1) + 1;
}

export async function createCategory(
  tx: Prisma.TransactionClient,
  input: {
    id: string;
    slug: string;
    parentId: string | null;
    icon: Prisma.CategoryUncheckedCreateInput["icon"];
    sortOrder: number;
    translations: CategoryTranslationWrite[];
  },
) {
  await tx.category.create({
    data: {
      id: input.id,
      slug: input.slug,
      parentId: input.parentId,
      ownerPortal: PORTAL,
      icon: input.icon,
      sortOrder: input.sortOrder,
      translations: { create: input.translations },
    },
  });
}

export async function setCategoriesActive(
  tx: Prisma.TransactionClient,
  ids: string[],
  active: boolean,
) {
  await tx.category.updateMany({
    where: { id: { in: ids }, ownerPortal: PORTAL },
    data: { active, version: { increment: 1 } },
  });
}

export async function deleteCategoryWithFields(
  tx: Prisma.TransactionClient,
  categoryId: string,
) {
  await tx.attributeDefinition.deleteMany({ where: { categoryId } });
  await tx.category.delete({ where: { id: categoryId } });
}

export function findAttributeDefinition(tx: Prisma.TransactionClient, id: string) {
  return tx.attributeDefinition.findUnique({
    where: { id },
    include: { category: true, _count: { select: { values: true } } },
  });
}

export async function createAttributeDefinition(
  tx: Prisma.TransactionClient,
  input: {
    id: string;
    categoryId: string;
    key: string;
    type: Prisma.AttributeDefinitionUncheckedCreateInput["type"];
    required: boolean;
    filterable: boolean;
    unit: string | null;
    min: number | null;
    max: number | null;
    options: Prisma.InputJsonValue;
    sortOrder: number;
    translations: FieldTranslationWrite[];
  },
) {
  const { translations, ...field } = input;
  await tx.attributeDefinition.create({
    data: { ...field, translations: { create: translations } },
  });
}

export async function deleteAttributeDefinition(
  tx: Prisma.TransactionClient,
  id: string,
) {
  await tx.attributeDefinition.delete({ where: { id } });
}
