import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const choices = [
  ["other", "Biçikleta të tjera", "Other bicycles", "Weitere Fahrräder"],
  ["bmx", "Biçikleta BMX", "BMX bikes", "BMX-Räder"],
  ["city", "Biçikleta qyteti", "City bikes", "Cityräder"],
  [
    "cross_trekking",
    "Biçikleta Cross dhe Trekking",
    "Cross & Trekking bikes",
    "Cross- & Trekkingräder",
  ],
  ["cruiser", "Cruiser", "Cruiser", "Cruiser"],
  ["electric", "Biçikleta elektrike", "Electric bicycles", "Elektrofahrräder"],
  [
    "fixie_singlespeed",
    "Fixie dhe Singlespeed",
    "Fixie & Singlespeed",
    "Fixie & Singlespeed",
  ],
  ["folding", "Biçikleta të palosshme", "Folding bikes", "Klappräder"],
  ["cargo", "Biçikleta transporti", "Cargo bikes", "Lastenräder"],
  ["mountain", "Biçikleta malore", "Mountain bikes", "Mountainbikes"],
  ["racing", "Biçikleta garash", "Racing bikes", "Rennräder"],
  ["tandem", "Biçikleta tandem", "Tandems", "Tandems"],
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.log(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "bicycles" },
        include: { attributes: true },
      });
      if (!category.active || category.ownerPortal !== "SHITJAKOS") {
        throw new Error("Expected an active Bicycles category.");
      }
      // Preserve the existing audience/accessories field and administrator edits.
      if (category.attributes.some((field) => field.key === "bicycle_type")) {
        return "Bicycle type already exists; preserved.";
      }
      await tx.attributeDefinition.create({
        data: {
          id: "bicycles-bicycle-type",
          categoryId: category.id,
          key: "bicycle_type",
          type: "SELECT",
          required: false,
          filterable: true,
          filterDisplay: "RADIO",
          sortOrder:
            Math.max(0, ...category.attributes.map((field) => field.sortOrder)) + 1,
          options: choices.map(([value, sq, en, de]) => ({
            value,
            labels: { sq, en, de },
          })),
          translations: {
            create: [
              { locale: "sq", label: "Lloji i biçikletës" },
              { locale: "en", label: "Bicycle type" },
              { locale: "de", label: "Fahrradtyp" },
            ],
          },
        },
      });
      return "Created Bicycle type with 12 choices. Existing fields preserved.";
    }),
  );
} finally {
  await db.$disconnect();
}
