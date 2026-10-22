import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";

const materials = [
  ["wood", "Dru", "Wood", "Holz"],
  ["other", "Tjetër", "Other", "Sonstige"],
  ["metal", "Metal", "Metal", "Metall"],
  ["plastic", "Plastikë", "Plastic", "Kunststoff"],
  ["fabric", "Pëlhurë", "Fabric", "Stoff"],
  ["leather", "Lëkurë", "Leather", "Leder"],
  ["glass", "Qelq", "Glass", "Glas"],
  ["steel", "Çelik", "Steel", "Stahl"],
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.table(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "home-office" },
        include: { attributes: true },
      });
      if (
        !category.active ||
        category.parentId !== "home" ||
        category.ownerPortal !== "SHITJAKOS"
      ) {
        throw new Error("Expected active Home / Office.");
      }
      // The supplied colors match the existing translated Home Textiles palette.
      const palette = await tx.attributeDefinition.findUniqueOrThrow({
        where: { categoryId_key: { categoryId: "home-textiles", key: "color" } },
      });
      if (!Array.isArray(palette.options) || palette.options.length !== 20) {
        throw new Error("Expected the 20 translated Home Textiles colors.");
      }
      const fields = [
        {
          key: "color",
          names: { sq: "Ngjyra", en: "Color", de: "Farbe" },
          options: palette.options as Prisma.InputJsonValue,
        },
        {
          key: "material",
          names: { sq: "Materiali", en: "Material", de: "Material" },
          options: materials.map(([value, sq, en, de]) => ({
            value,
            labels: { sq, en, de },
          })),
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
            id: `home-office-${field.key}`,
            categoryId: category.id,
            key: field.key,
            type: "SELECT",
            required: false,
            filterable: true,
            filterDisplay: "CHECKBOX",
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
