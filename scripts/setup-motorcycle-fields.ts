import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";

const brands = [
  "Aprilia",
  "BMW",
  "Buell",
  "Ducati",
  "Harley",
  "Honda",
  "Husqvarna",
  "Kawasaki",
  "KTM",
  "Kymco",
  "Moto Guzzi",
  "MZ",
  "Peugeot",
  "Piaggio",
  "Simson",
  "Suzuki",
  "Triumph",
  "Vespa",
  "Yamaha",
  "Zündapp",
];
const option = (value: string, sq: string, en = sq, de = en) => ({
  value,
  labels: { sq, en, de },
});
const definitions = [
  {
    key: "brand",
    type: "SELECT",
    filterDisplay: "DROPDOWN",
    names: { sq: "Marka", en: "Brand", de: "Marke" },
    options: [
      ...brands.map((brand) =>
        option(
          brand
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replaceAll(" ", "_"),
          brand,
        ),
      ),
      option("other", "Markë tjetër", "Other motorcycles", "Weitere Motorräder"),
    ],
  },
  {
    key: "mileage",
    type: "NUMBER",
    unit: "km",
    min: 0,
    names: { sq: "Kilometrazhi", en: "Mileage", de: "Kilometerstand" },
  },
  {
    key: "first_registration_year",
    type: "NUMBER",
    min: 1885,
    names: {
      sq: "Viti i regjistrimit të parë",
      en: "Year of first registration",
      de: "Erstzulassungsjahr",
    },
  },
  {
    key: "transmission",
    type: "SELECT",
    filterDisplay: "RADIO",
    names: { sq: "Transmisioni", en: "Transmission", de: "Getriebe" },
    options: [
      option("manual", "Manual", "Manual", "Schaltgetriebe"),
      option("automatic", "Automatik", "Automatic", "Automatik"),
      option("semi_automatic", "Gjysmë-automatik", "Semi-automatic", "Halbautomatik"),
    ],
  },
] satisfies Array<{
  key: string;
  type: "SELECT" | "NUMBER";
  names: Record<string, string>;
  filterDisplay?: string;
  unit?: string;
  min?: number;
  options?: Prisma.InputJsonValue;
}>;

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  const result = await db.$transaction(
    async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "motorcycles" },
        include: { attributes: true },
      });
      if (
        !category.active ||
        category.parentId !== "auto" ||
        category.ownerPortal !== "SHITJAKOS"
      ) {
        throw new Error("Expected the active Auto / Motorcycles subcategory.");
      }
      let order = Math.max(0, ...category.attributes.map((field) => field.sortOrder));
      const results = [];
      for (const definition of definitions) {
        // Reruns preserve administrator edits and all existing answers.
        if (category.attributes.some((field) => field.key === definition.key)) {
          results.push({ field: definition.key, status: "Already exists; preserved" });
          continue;
        }
        const { names, ...data } = definition;
        await tx.attributeDefinition.create({
          data: {
            ...data,
            id: `motorcycles-${definition.key}`,
            categoryId: category.id,
            required: false,
            filterable: true,
            sortOrder: ++order,
            translations: {
              create: Object.entries(names).map(([locale, label]) => ({ locale, label })),
            },
          },
        });
        results.push({ field: definition.key, status: "Created" });
      }
      return results;
    },
    { timeout: 30000 },
  );
  console.table(result);
} finally {
  await db.$disconnect();
}
