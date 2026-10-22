import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const colors = [
  ["other", "Ngjyra të tjera", "Other colors", "Andere Farben"],
  ["beige", "Bezhë", "Beige", "Beige"],
  ["blue", "Blu", "Blue", "Blau"],
  ["brown", "Kafe", "Brown", "Braun"],
  ["multicolor", "Shumëngjyrëshe", "Multicolor", "Bunt"],
  ["burgundy", "Bordo", "Burgundy red", "Burgunderrot"],
  ["yellow", "E verdhë", "Yellow", "Gelb"],
  ["gold", "Ari", "Gold", "Gold"],
  ["gray", "Gri", "Gray", "Grau"],
  ["green", "E gjelbër", "Green", "Grün"],
  ["wood", "Dru", "Wood", "Holz"],
  ["khaki", "Kaki", "Khaki", "Khaki"],
  ["purple", "Vjollcë", "Purple", "Lila"],
  ["orange", "Portokalli", "Orange", "Orange"],
  ["pink", "Rozë", "Pink", "Rosa"],
  ["red", "E kuqe", "Red", "Rot"],
  ["black", "E zezë", "Black", "Schwarz"],
  ["silver", "Argjend", "Silver", "Silber"],
  ["transparent", "Transparente", "Transparent", "Transparent"],
  ["white", "E bardhë", "White", "Weiß"],
];
const materials = [
  ["cotton", "Pambuk", "Cotton", "Baumwolle"],
  ["other", "Tjetër", "Other", "Sonstige"],
  ["polyester", "Poliestër", "Polyester", "Polyester"],
  ["wool", "Lesh", "Wool", "Wolle"],
  ["mixed_fabric", "Pëlhurë e përzier", "Mixed fabric", "Mischgewebe"],
  ["linen", "Liri", "Linen", "Leinen"],
  ["velvet", "Kadife", "Velvet", "Samt"],
  ["natural_fiber", "Fibra natyrore", "Natural fiber", "Naturfaser"],
];
const definitions = [
  { key: "color", names: { sq: "Ngjyra", en: "Color", de: "Farbe" }, choices: colors },
  {
    key: "material",
    names: { sq: "Materiali", en: "Material", de: "Material" },
    choices: materials,
  },
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.table(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "home-textiles" },
        include: { attributes: true },
      });
      if (
        !category.active ||
        category.parentId !== "home" ||
        category.ownerPortal !== "SHITJAKOS"
      ) {
        throw new Error("Expected active Home Textiles.");
      }
      let order = Math.max(-1, ...category.attributes.map((field) => field.sortOrder));
      const summary = [];
      for (const field of definitions) {
        if (category.attributes.some((existing) => existing.key === field.key)) {
          summary.push({ field: field.key, status: "Already exists; preserved" });
          continue;
        }
        await tx.attributeDefinition.create({
          data: {
            id: `home-textiles-${field.key}`,
            categoryId: category.id,
            key: field.key,
            type: "SELECT",
            required: false,
            filterable: true,
            filterDisplay: "CHECKBOX",
            sortOrder: ++order,
            options: field.choices.map(([value, sq, en, de]) => ({
              value,
              labels: { sq, en, de },
            })),
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
          choices: field.choices.length,
        });
      }
      return summary;
    }),
  );
} finally {
  await db.$disconnect();
}
