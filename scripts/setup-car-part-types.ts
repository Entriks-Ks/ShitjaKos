import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const choices = [
  [
    "audio_navigation",
    "Audio dhe navigacion për vetura",
    "Car audio & navigation",
    "Auto Hifi & Navigation",
  ],
  [
    "replacement_repair_parts",
    "Pjesë këmbimi dhe riparimi",
    "Replacement & repair parts",
    "Ersatz- & Reparaturteile",
  ],
  ["tyres_rims", "Goma dhe disqe", "Tyres & rims", "Reifen & Felgen"],
  ["tuning_styling", "Tuning dhe stilim", "Tuning & styling", "Tuning & Styling"],
  ["tools", "Vegla", "Tools", "Werkzeug"],
  ["other", "Pjesë të tjera veturash", "Other car parts", "Weitere Autoteile"],
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.log(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "car-parts" },
        include: { attributes: true },
      });
      if (
        !category.active ||
        category.parentId !== "auto" ||
        category.ownerPortal !== "SHITJAKOS"
      ) {
        throw new Error("Expected the active Auto / Car parts category.");
      }
      // Preserve administrator edits and existing answers if this script is rerun.
      if (category.attributes.some((field) => field.key === "type")) {
        return "Car parts Type already exists; preserved.";
      }
      await tx.attributeDefinition.create({
        data: {
          id: "car-parts-type",
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
      return "Created car parts Type with 6 translated choices and RADIO search display.";
    }),
  );
} finally {
  await db.$disconnect();
}
