import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";

const brands = [
  "Amazfit",
  "Apple",
  "Casio",
  "Coros",
  "Diesel",
  "Fitbit",
  "Fossil",
  "Garmin",
  "Google",
  "Honor",
  "Huawei",
  "LG",
  "Michael Kors",
  "Mobvoi",
  "Motorola",
  "OnePlus",
  "Oppo",
  "Oura",
  "Pebble",
  "Polar",
  "Realme",
  "Samsung",
  "Skagen",
  "Sony",
  "Suunto",
  "TomTom",
  "Ultrahuman",
  "Withings",
  "Xiaomi",
];
const colors = [
  ["other", "Ngjyra të tjera", "Other colors", "Andere Farben"],
  ["beige", "Bezhë", "Beige", "Beige"],
  ["blue", "Blu", "Blue", "Blau"],
  ["brown", "Kafe", "Brown", "Braun"],
  ["multicolor", "Shumëngjyrëshe", "Multicolor", "Bunt"],
  ["burgundy", "Bordo", "Burgundy", "Burgunderrot"],
  ["cream", "Krem", "Cream", "Creme"],
  ["yellow", "E verdhë", "Yellow", "Gelb"],
  ["gold", "Ari", "Gold", "Gold"],
  ["gray", "Gri", "Gray", "Grau"],
  ["green", "E gjelbër", "Green", "Grün"],
  ["wood", "Dru", "Wood", "Holz"],
  ["khaki", "Kaki", "Khaki", "Khaki"],
  ["lavender", "Livando", "Lavender", "Lavendel"],
  ["purple", "Vjollcë", "Purple", "Lila"],
  ["orange", "Portokalli", "Orange", "Orange"],
  ["pink", "Rozë e ndezur", "Pink", "Pink"],
  ["print", "Me motive", "Print", "Print"],
  ["rose", "Rozë", "Rose", "Rosa"],
  ["rose_tone", "Ngjyrë trëndafili", "Rose tone", "Rosé"],
  ["rose_gold", "Ari rozë", "Rose gold", "Roségold"],
  ["red", "E kuqe", "Red", "Rot"],
  ["black", "E zezë", "Black", "Schwarz"],
  ["silver", "Argjend", "Silver", "Silber"],
  ["transparent", "Transparente", "Transparent", "Transparent"],
  ["turquoise", "Turkeze", "Turquoise", "Türkis"],
  ["white", "E bardhë", "White", "Weiß"],
];
const waterproof = [
  ["none", "Jo rezistent ndaj ujit", "Not waterproof", "Nicht wasserdicht"],
  [
    "ipx4_ip54",
    "Rezistent ndaj spërkatjeve (IPX4 / IP54)",
    "Splashproof (IPX4 / IP54)",
    "Spritzwassergeschützt (IPX4 / IP54)",
  ],
  [
    "ipx7_ip67",
    "Zhytje e shkurtër (IPX7 / IP67)",
    "Brief immersion (IPX7 / IP67)",
    "Kurzzeitiges Untertauchen (IPX7 / IP67)",
  ],
  [
    "ipx8_ip68",
    "Zhytje e vazhdueshme (IPX8 / IP68)",
    "Permanent immersion (IPX8 / IP68)",
    "Dauerhaftes Untertauchen (IPX8 / IP68)",
  ],
  ["5_atm", "5 ATM / 50 m (not)", "5 ATM / 50 m (swimming)", "5 ATM / 50 m (Schwimmen)"],
  [
    "10_atm",
    "10 ATM / 100 m (sporte ujore)",
    "10 ATM / 100 m (water sports)",
    "10 ATM / 100 m (Wassersport)",
  ],
  [
    "20_atm_plus",
    "20 ATM+ / 200 m (zhytje)",
    "20 ATM+ / 200 m (diving)",
    "20 ATM+ / 200 m (Tauchen)",
  ],
];
type Field = {
  key: string;
  type: "SELECT" | "NUMBER";
  names: { sq: string; en: string; de: string };
  filterDisplay?: string;
  unit?: string;
  min?: number;
  max?: number;
  options?: Prisma.InputJsonValue;
};
const choice = ([value, sq, en, de]: string[]) => ({ value, labels: { sq, en, de } });
const fields: Field[] = [
  {
    key: "brand",
    type: "SELECT",
    filterDisplay: "RADIO",
    names: { sq: "Marka", en: "Brand", de: "Marke" },
    options: [
      ...brands.map((name) => ({
        value: name.toLowerCase().replaceAll(" ", "_"),
        labels: { sq: name, en: name, de: name },
      })),
      choice(["other", "Tjetër", "Other", "Sonstige"]),
    ],
  },
  {
    key: "color",
    type: "SELECT",
    filterDisplay: "CHECKBOX",
    names: { sq: "Ngjyra", en: "Color", de: "Farbe" },
    options: colors.map(choice),
  },
  {
    key: "waterproof",
    type: "SELECT",
    filterDisplay: "RADIO",
    names: { sq: "Rezistenca ndaj ujit", en: "Waterproof", de: "Wasserdichtigkeit" },
    options: waterproof.map(choice),
  },
  {
    key: "case_size",
    type: "NUMBER",
    unit: "mm",
    min: 1,
    max: 200,
    names: { sq: "Madhësia e kasës", en: "Case size", de: "Gehäusegröße" },
  },
  {
    key: "ring_size",
    type: "NUMBER",
    min: 1,
    max: 100,
    names: { sq: "Madhësia e unazës", en: "Ring size", de: "Ringgröße" },
  },
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.table(
    await db.$transaction(
      async (tx) => {
        const category = await tx.category.findUniqueOrThrow({
          where: { id: "wearables" },
          include: { attributes: true },
        });
        if (
          !category.active ||
          category.parentId !== "electronics" ||
          category.ownerPortal !== "SHITJAKOS"
        ) {
          throw new Error("Expected the active Electronics / Wearables category.");
        }
        const summary = [];
        let order = Math.max(0, ...category.attributes.map((field) => field.sortOrder));
        for (const field of fields) {
          if (category.attributes.some((existing) => existing.key === field.key)) {
            summary.push({ field: field.key, status: "Already exists; preserved" });
            continue;
          }
          const { names, ...data } = field;
          await tx.attributeDefinition.create({
            data: {
              ...data,
              id: `wearables-${field.key}`,
              categoryId: category.id,
              required: false,
              filterable: true,
              sortOrder: ++order,
              translations: {
                create: Object.entries(names).map(([locale, label]) => ({
                  locale,
                  label,
                })),
              },
            },
          });
          summary.push({ field: field.key, status: "Created" });
        }
        return summary;
      },
      { timeout: 30000 },
    ),
  );
} finally {
  await db.$disconnect();
}
