import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";

const types = [
  ["beds", "Shtretër", "Beds", "Betten"],
  ["slatted_bases", "Bazamente krevati me dërrasa", "Slatted bed bases", "Lattenroste"],
  ["mattresses", "Dyshekë", "Mattresses", "Matratzen"],
  ["bedside_tables", "Komodina", "Bedside tables", "Nachttische"],
  ["wardrobes", "Dollapë", "Wardrobes", "Schränke"],
  [
    "other",
    "Mobilie të tjera për dhomën e gjumit",
    "Other bedroom furniture",
    "Weiteres Schlafzimmer",
  ],
];
const materials = [
  ["wood", "Dru", "Wood", "Holz"],
  ["other", "Tjetër", "Other", "Sonstige"],
  ["fabric", "Pëlhurë", "Fabric", "Stoff"],
  ["metal", "Metal", "Metal", "Metall"],
  ["solid_wood", "Dru masiv", "Solid wood", "Massivholz"],
  ["plastic", "Plastikë", "Plastic", "Kunststoff"],
  ["oak", "Dru lisi", "Oak", "Eiche"],
  ["pine", "Dru pishe", "Pine", "Kiefer"],
];
const option = ([value, sq, en, de]: string[]) => ({ value, labels: { sq, en, de } });
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.table(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "bedroom" },
        include: { attributes: true },
      });
      if (
        !category.active ||
        category.parentId !== "home" ||
        category.ownerPortal !== "SHITJAKOS"
      ) {
        throw new Error("Expected active Home / Bedroom.");
      }
      // The supplied bedroom colors match the translated Home Textiles palette.
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
          options: types.map(option),
        },
        {
          key: "color",
          names: { sq: "Ngjyra", en: "Color", de: "Farbe" },
          display: "CHECKBOX",
          options: palette.options as Prisma.InputJsonValue,
        },
        {
          key: "material",
          names: { sq: "Materiali", en: "Material", de: "Material" },
          display: "CHECKBOX",
          options: materials.map(option),
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
            id: `bedroom-${field.key}`,
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
