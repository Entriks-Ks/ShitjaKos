import type { Prisma } from "../src/generated/prisma/client";
import { catalogOptions, type CatalogOption } from "../src/lib/attribute-dependencies";
import { brandModelCatalog } from "./brand-model-catalog";
import { MAX_SELECT_CHOICES } from "../src/lib/catalog-limits";

const normalized = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const key = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
const labels = (value: string) => ({ sq: value, en: value, de: value });
const otherLabels = { sq: "Tjetër", en: "Other", de: "Andere" };
const matches = (option: CatalogOption, name: string) =>
  [option.value, ...Object.values(option.labels)].some(
    (value) => normalized(value) === normalized(name),
  );

/**
 * Additive catalog upgrade. Stable option values and existing listing answers are
 * retained. Converting the legacy TEXT model preserves every stored text value as
 * a brand-scoped choice; it never rewrites a listing answer.
 */
export async function seedBrandModels(tx: Prisma.TransactionClient) {
  const summary = [];
  for (const [categoryId, preset] of Object.entries(brandModelCatalog)) {
    const category = await tx.category.findUnique({
      where: { id: categoryId },
      include: { attributes: true },
    });
    if (!category || !category.active || category.ownerPortal !== "SHITJAKOS") {
      throw new Error(
        `Active category ${categoryId} was not found. No catalog changes were applied.`,
      );
    }
    const candidates = category.attributes.filter((field) =>
      ["brand", "make", "marka", "manufacturer", "console_type"].includes(field.key),
    );
    if (candidates.length > 1)
      throw new Error(
        `Multiple brand fields in ${categoryId}; resolve them before setup.`,
      );
    let brand = candidates[0];
    if (brand && brand.type !== "SELECT")
      throw new Error(`Brand in ${categoryId} must be a SELECT.`);
    const brands = catalogOptions(brand?.options).map((option) => ({
      ...option,
      labels: { ...option.labels },
    }));
    const mappings = new Map<string, string[]>();
    for (const [name, models] of Object.entries(preset)) {
      let option = brands.find((item) => matches(item, name));
      if (!option) {
        option = {
          value: key(name),
          labels: name === "Other" ? otherLabels : labels(name),
        };
        brands.push(option);
      } else if (name !== "Other") {
        // Correct truncated labels without changing the stored value.
        option.labels = labels(name);
      }
      mappings.set(option.value, models);
    }
    if (!brand) {
      brand = await tx.attributeDefinition.create({
        data: {
          id: `${categoryId}-brand`,
          categoryId,
          key: "brand",
          type: "SELECT",
          required: false,
          options: brands,
          filterable: true,
          sortOrder: -2,
          translations: {
            create: [
              { locale: "sq", label: "Marka" },
              {
                locale: "en",
                label: categoryId === "gaming" ? "Console brand" : "Brand",
              },
              { locale: "de", label: "Marke" },
            ],
          },
        },
      });
    } else {
      await tx.attributeDefinition.update({
        where: { id: brand.id },
        data: { options: brands, filterable: true, sortOrder: -2 },
      });
    }
    const model = category.attributes.find((field) => field.key === "model");
    if (model && !["TEXT", "SELECT"].includes(model.type))
      throw new Error(`Model in ${categoryId} has an incompatible type.`);
    if (model?.dependsOnId && model.dependsOnId !== brand.id)
      throw new Error(`Model in ${categoryId} already depends on another field.`);
    const options: CatalogOption[] = catalogOptions(model?.options).map((option) => ({
      ...option,
      parentValues: [...(option.parentValues ?? [])],
    }));
    const add = (value: string, name: string, parentValue: string) => {
      let option = options.find((item) => item.value === value);
      if (!option) {
        option = {
          value,
          labels: name === "Other" ? otherLabels : labels(name),
          parentValues: [],
        };
        options.push(option);
      }
      if (!option.parentValues!.includes(parentValue))
        option.parentValues!.push(parentValue);
    };
    // Preserve all saved text/selection answers and their actual brand association.
    if (model) {
      const answers = await tx.listingAttributeValue.findMany({
        where: { attributeId: model.id },
        include: {
          listing: { select: { attributes: { where: { attributeId: brand.id } } } },
        },
      });
      for (const answer of answers) {
        const parent = answer.listing.attributes[0]?.value;
        if (
          typeof answer.value !== "string" ||
          typeof parent !== "string" ||
          !brands.some((item) => item.value === parent)
        ) {
          throw new Error(
            `Listing ${answer.listingId} needs a valid brand before its model can be upgraded.`,
          );
        }
        add(answer.value, answer.value, parent);
      }
    }
    for (const option of brands) {
      for (const name of [...(mappings.get(option.value) ?? []), "Other"]) {
        const existing = options.find(
          (item) =>
            matches(item, name) &&
            (item.parentValues?.includes(option.value) || !item.parentValues?.length),
        );
        add(existing?.value ?? `${key(option.value)}_${key(name)}`, name, option.value);
      }
    }
    if (options.some((option) => !option.parentValues?.length)) {
      throw new Error(
        `Unmapped custom model choices in ${categoryId}. Assign their brands before upgrading.`,
      );
    }
    if (options.length > MAX_SELECT_CHOICES || brands.length > MAX_SELECT_CHOICES) {
      throw new Error(`${categoryId} exceeds the supported catalog choice limit.`);
    }
    const data = {
      type: "SELECT" as const,
      options,
      dependsOnId: brand.id,
      filterable: true,
      sortOrder: -1,
    };
    await tx.attributeDefinition.upsert({
      where: { categoryId_key: { categoryId, key: "model" } },
      create: {
        id: `${categoryId}-model`,
        categoryId,
        key: "model",
        required: false,
        ...data,
        translations: {
          create: [
            { locale: "sq", label: "Modeli" },
            { locale: "en", label: "Model" },
            { locale: "de", label: "Modell" },
          ],
        },
      },
      update: data,
    });
    summary.push({ category: categoryId, brands: brands.length, models: options.length });
  }
  return summary;
}
