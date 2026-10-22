import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const choices = [
  ["ball_sports", "Sporte me top", "Ball sports", "Ballsport"],
  [
    "camping_outdoor",
    "Kamping dhe aktivitete në natyrë",
    "Camping & Outdoor",
    "Camping & Outdoor",
  ],
  ["fitness", "Fitnes", "Fitness", "Fitness"],
  ["cycling", "Çiklizëm", "Cycling", "Radsport"],
  ["dancing_running", "Vallëzim dhe vrapim", "Dancing & Running", "Tanzen & Laufen"],
  ["water_sports", "Sporte ujore", "Water sports", "Wassersport"],
  ["winter_sports", "Sporte dimërore", "Winter sports", "Wintersport"],
  [
    "other",
    "Sporte dhe pajisje kampingu të tjera",
    "Other sports & camping",
    "Weiteres Sport & Camping",
  ],
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.log(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "outdoors" },
        include: { attributes: true },
      });
      if (
        !category.active ||
        category.parentId !== "sports" ||
        category.ownerPortal !== "SHITJAKOS"
      ) {
        throw new Error("Expected active Sport & Camping.");
      }
      if (category.attributes.some((field) => field.key === "type")) {
        return "Sport & Camping Type already exists; preserved.";
      }
      await tx.attributeDefinition.create({
        data: {
          id: "outdoors-type",
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
      return "Created Sport & Camping Type with 8 translated choices and RADIO search display.";
    }),
  );
} finally {
  await db.$disconnect();
}
