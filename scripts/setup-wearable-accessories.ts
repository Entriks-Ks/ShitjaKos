import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";

const brands = [
  "Anker",
  "Apple band",
  "Apple",
  "BandWerk",
  "Belkin",
  "Bluestein",
  "Burga",
  "Casetify",
  "ESR",
  "Garmin",
  "Hama",
  "Hermès",
  "Nomad",
  "OtterBox",
  "Pitaka",
  "Rhinoshield",
  "Ringke",
  "Samsung",
  "Spigen",
  "Supcase",
  "UAG",
];
const types = [
  ["chargers_cables", "Karikues dhe kabllo", "Chargers & Cables", "Ladegeräte & Kabel"],
  ["bracelets", "Rripa për orë", "Bracelets", "Armbänder"],
  ["spare_parts", "Pjesë këmbimi", "Spare parts", "Ersatzteile"],
  ["mounts", "Mbajtëse", "Mounts", "Halterungen"],
  [
    "cases_protection",
    "Mbështjellëse dhe mbrojtje",
    "Cases & Protection",
    "Hüllen & Schutz",
  ],
  ["other", "Aksesorë të tjerë", "Additional accessories", "Weiteres Zubehör"],
];
const sizes = [
  ["other", "Tjetër", "Other", "Sonstige"],
  [
    "apple_watch_42_44_45_49",
    "Kasë Apple Watch 42 / 44 / 45 / 49 mm",
    "Apple Watch case 42 / 44 / 45 / 49 mm",
    "Apple Watch Gehäuse 42 / 44 / 45 / 49 mm",
  ],
  [
    "apple_watch_38_40_41",
    "Kasë Apple Watch 38 / 40 / 41 mm",
    "Apple Watch case 38 / 40 / 41 mm",
    "Apple Watch Gehäuse 38 / 40 / 41 mm",
  ],
  ["one_size", "Madhësi universale", "One size fits all", "Einheitsgröße"],
  ["l", "L", "L", "L"],
  ["20_mm", "20 mm", "20 mm", "20 mm"],
  ["m", "M", "M", "M"],
  ["22_mm", "22 mm", "22 mm", "22 mm"],
];
const choice = ([value, sq, en, de]: string[]) => ({ value, labels: { sq, en, de } });
const categoryNames = {
  sq: "Aksesorë për pajisje inteligjente",
  en: "Wearable accessories",
  de: "Wearable-Zubehör",
};
const wearableNames = { sq: "Pajisje inteligjente", en: "Wearables", de: "Wearables" };

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.table(
    await db.$transaction(
      async (tx) => {
        const source = await tx.category.findUniqueOrThrow({
          where: { id: "wearables" },
          include: { attributes: true, translations: true },
        });
        if (
          !source.active ||
          source.parentId !== "electronics" ||
          source.ownerPortal !== "SHITJAKOS"
        ) {
          throw new Error("Expected active Electronics / Wearables.");
        }
        const colors = source.attributes.find((field) => field.key === "color");
        if (!colors || !Array.isArray(colors.options) || colors.options.length !== 27) {
          throw new Error(
            "Expected the 27 translated wearable colors before copying them.",
          );
        }
        const parent = await tx.category.findUniqueOrThrow({
          where: { id: "electronics" },
        });
        if (!parent.active) throw new Error("Electronics must be active.");
        if (
          source.translations.some(
            (translation) =>
              wearableNames[translation.locale as keyof typeof wearableNames] !==
              translation.name,
          )
        ) {
          await tx.category.update({
            where: { id: source.id },
            data: {
              version: { increment: 1 },
              translations: {
                upsert: Object.entries(wearableNames).map(([locale, name]) => ({
                  where: { categoryId_locale: { categoryId: source.id, locale } },
                  create: { locale, name },
                  update: { name },
                })),
              },
            },
          });
        }
        let target = await tx.category.findUnique({
          where: { id: "wearable-accessories" },
        });
        if (!target) {
          // Insert next to Wearables while retaining the order of the other categories.
          await tx.category.updateMany({
            where: { parentId: "electronics", sortOrder: { gt: source.sortOrder } },
            data: { sortOrder: { increment: 1 } },
          });
          target = await tx.category.create({
            data: {
              id: "wearable-accessories",
              slug: "wearable-accessories",
              parentId: "electronics",
              icon: source.icon,
              sortOrder: source.sortOrder + 1,
              translations: {
                create: Object.entries(categoryNames).map(([locale, name]) => ({
                  locale,
                  name,
                })),
              },
            },
          });
        }
        if (target.parentId !== "electronics" || target.ownerPortal !== "SHITJAKOS") {
          throw new Error(
            "Existing accessory category has an unexpected parent or portal.",
          );
        }
        const fields = [
          {
            key: "type",
            names: { sq: "Lloji", en: "Type", de: "Art" },
            display: "RADIO",
            options: types.map(choice),
          },
          {
            key: "brand",
            names: { sq: "Marka", en: "Brand", de: "Marke" },
            display: "RADIO",
            options: [
              ...brands.map((name) => ({
                value: name
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .replaceAll(" ", "_"),
                labels: { sq: name, en: name, de: name },
              })),
              choice(["other", "Tjetër", "Other", "Sonstige"]),
            ],
          },
          {
            key: "color",
            names: { sq: "Ngjyra", en: "Color", de: "Farbe" },
            display: "CHECKBOX",
            options: colors.options as Prisma.InputJsonValue,
          },
          {
            key: "bracelet_size",
            names: { sq: "Madhësia e rripit", en: "Bracelet size", de: "Armbandgröße" },
            display: "RADIO",
            options: sizes.map(choice),
          },
        ];
        const summary = [];
        for (const [sortOrder, field] of fields.entries()) {
          const existing = await tx.attributeDefinition.findUnique({
            where: { categoryId_key: { categoryId: target.id, key: field.key } },
          });
          if (existing) {
            summary.push({ field: field.key, status: "Already exists; preserved" });
            continue;
          }
          await tx.attributeDefinition.create({
            data: {
              id: `${target.id}-${field.key}`,
              categoryId: target.id,
              key: field.key,
              type: "SELECT",
              required: false,
              filterable: true,
              filterDisplay: field.display,
              options: field.options,
              sortOrder,
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
      },
      { timeout: 30000 },
    ),
  );
} finally {
  await db.$disconnect();
}
