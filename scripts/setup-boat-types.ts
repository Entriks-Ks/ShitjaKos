import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const choices = [
  ["motorboats", "Varka me motor", "Motorboats", "Motorboote"],
  ["sailboats", "Varka me vela", "Sailboats", "Segelboote"],
  ["small_boats", "Varka të vogla", "Small boats", "Kleinboote"],
  ["inflatable_boats", "Varka me fryrje", "Inflatable boats", "Schlauchboote"],
  ["jet_skis", "Motorë uji", "Jet skis", "Jetski"],
  ["boat_trailers", "Rimorkio për varka", "Boat trailers", "Bootstrailer"],
  ["boat_moorings", "Vende ankorimi për varka", "Boat moorings", "Bootsliegeplätze"],
  ["boat_accessories", "Aksesorë për varka", "Boat accessories", "Bootszubehör"],
  ["other", "Varka të tjera", "Other boats", "Weitere Boote"],
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.log(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "boats" },
        include: { attributes: true },
      });
      if (!category.active || category.ownerPortal !== "SHITJAKOS") {
        throw new Error("Expected the active Boats category.");
      }
      // Reruns preserve any later administrator edits and saved listing answers.
      if (category.attributes.some((field) => field.key === "type")) {
        return "Boat Type already exists; preserved.";
      }
      await tx.attributeDefinition.create({
        data: {
          id: "boats-type",
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
      return "Created boat Type with 9 translated choices and RADIO search display.";
    }),
  );
} finally {
  await db.$disconnect();
}
