import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";

const types = [
  ["cutlery", "Takëme", "Cutlery", "Besteck"],
  ["tableware", "Enë tavoline", "Tableware", "Geschirr"],
  ["glasses", "Gota", "Glasses", "Gläser"],
  ["small_appliances", "Pajisje të vogla kuzhine", "Small appliances", "Kleingeräte"],
  ["kitchen_cabinets", "Dollapë kuzhine", "Kitchen cabinets", "Küchenschränke"],
  ["chairs", "Karrige", "Chairs", "Stühle"],
  ["tables", "Tavolina", "Tables", "Tische"],
  [
    "other",
    "Artikuj të tjerë për kuzhinë dhe ngrënie",
    "Other kitchen & dining items",
    "Weiteres Küche & Esszimmer",
  ],
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.table(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "appliances" },
        include: { attributes: true },
      });
      if (
        !category.active ||
        category.parentId !== "home" ||
        category.ownerPortal !== "SHITJAKOS"
      ) {
        throw new Error("Expected active Home / Kitchen & Dining room.");
      }
      // This supplied color list matches the existing translated Home Textiles palette.
      const palette = await tx.attributeDefinition.findUniqueOrThrow({
        where: { categoryId_key: { categoryId: "home-textiles", key: "color" } },
      });
      if (!Array.isArray(palette.options) || palette.options.length !== 20) {
        throw new Error("Expected the 20 translated Home Textiles colors.");
      }
      const fields = [
        {
          key: "type",
          names: { sq: "Lloji", en: "Type", de: "Art" },
          display: "RADIO",
          options: types.map(([value, sq, en, de]) => ({
            value,
            labels: { sq, en, de },
          })),
        },
        {
          key: "color",
          names: { sq: "Ngjyra", en: "Color", de: "Farbe" },
          display: "CHECKBOX",
          options: palette.options as Prisma.InputJsonValue,
        },
      ];
      let order = Math.max(-1, ...category.attributes.map((field) => field.sortOrder));
      const summary = [];
      for (const field of fields) {
        if (category.attributes.some((existing) => existing.key === field.key)) {
          summary.push({ field: field.key, status: "Already exists; preserved" });
          continue;
        }
        await tx.attributeDefinition.create({
          data: {
            id: `appliances-${field.key}`,
            categoryId: category.id,
            key: field.key,
            type: "SELECT",
            required: false,
            filterable: true,
            filterDisplay: field.display,
            sortOrder: ++order,
            options: field.options,
            translations: {
              create: Object.entries(field.names).map(([locale, label]) => ({
                locale,
                label,
              })),
            },
          },
        });
        summary.push({
          field: field.key,
          status: "Created",
          choices: Array.isArray(field.options) ? field.options.length : 0,
        });
      }
      return summary;
    }),
  );
} finally {
  await db.$disconnect();
}
