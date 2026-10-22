import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const choices = [
  ["flower_pots", "Vazo lulesh", "Flower pots", "Blumentöpfe"],
  ["decoration", "Dekorime", "Decoration", "Dekoration"],
  [
    "garden_tools",
    "Vegla dhe pajisje kopshti",
    "Garden tools & equipment",
    "Gartengeräte",
  ],
  ["garden_furniture", "Mobilie kopshti", "Garden furniture", "Gartenmöbel"],
  ["plants", "Bimë", "Plants", "Pflanzen"],
  [
    "other",
    "Aksesorë të tjerë kopshti dhe bimë",
    "Other garden accessories & plants",
    "Weiteres Gartenzubehör & Pflanzen",
  ],
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.log(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "garden" },
        include: { attributes: true },
      });
      if (
        !category.active ||
        category.parentId !== "home" ||
        category.ownerPortal !== "SHITJAKOS"
      ) {
        throw new Error("Expected active Garden accessories & plants.");
      }
      if (category.attributes.some((field) => field.key === "type")) {
        return "Garden accessories & plants Type already exists; preserved.";
      }
      await tx.attributeDefinition.create({
        data: {
          id: "garden-type",
          categoryId: category.id,
          key: "type",
          type: "SELECT",
          required: false,
          filterable: true,
          filterDisplay: "RADIO",
          sortOrder:
            Math.max(-1, ...category.attributes.map((field) => field.sortOrder)) + 1,
          options: choices.map(([value, sq, en, de]) => ({
            value,
            labels: { sq, en, de },
          })),
          translations: {
            create: [
              { locale: "sq", label: "Lloji" },
              { locale: "en", label: "Type" },
              { locale: "de", label: "Art" },
            ],
          },
        },
      });
      return "Created Garden accessories & plants Type with 6 translated choices and RADIO search display.";
    }),
  );
} finally {
  await db.$disconnect();
}
