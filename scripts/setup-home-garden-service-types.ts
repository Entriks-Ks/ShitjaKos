import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const choices = [
  [
    "construction_trades",
    "Ndërtim dhe punime artizanale",
    "Construction & trades",
    "Bau & Handwerk",
  ],
  [
    "gardening_landscaping",
    "Kopshtari dhe rregullim peizazhi",
    "Gardening & landscaping",
    "Garten- & Landschaftsbau",
  ],
  ["household_help", "Ndihmë në shtëpi", "Household help", "Haushaltshilfe"],
  ["cleaning", "Shërbime pastrimi", "Cleaning services", "Reinigungsservice"],
  ["repairs", "Riparime", "Repairs", "Reparaturen"],
  ["house_clearance", "Zbrazje banesash", "House clearance", "Wohnungsauflösungen"],
  [
    "other",
    "Shërbime të tjera për shtëpi dhe kopsht",
    "Other home & garden services",
    "Weitere Dienstleistungen Haus & Garten",
  ],
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.log(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "home-garden-service" },
        include: { attributes: true },
      });
      if (
        !category.active ||
        category.parentId !== "home" ||
        category.ownerPortal !== "SHITJAKOS"
      ) {
        throw new Error("Expected active Home & Garden Service.");
      }
      if (category.attributes.some((field) => field.key === "type")) {
        return "Home & Garden Service Type already exists; preserved.";
      }
      await tx.attributeDefinition.create({
        data: {
          id: "home-garden-service-type",
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
      return "Created Home & Garden Service Type with 7 translated choices and RADIO search display.";
    }),
  );
} finally {
  await db.$disconnect();
}
