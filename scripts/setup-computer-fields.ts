import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const brands = [
  "Acer",
  "Apple",
  "Asus",
  "Dell",
  "HP",
  "Huawei",
  "Lenovo",
  "LG",
  "Microsoft",
  "MSI",
  "Razer",
  "Samsung",
  "Toshiba",
  "Xiaomi",
];
const types = [
  ["laptop", "Laptop", "Laptop", "Laptop"],
  ["gaming_laptop", "Laptop për lojëra", "Gaming laptop", "Gaming Laptop"],
  [
    "convertible_2_in_1",
    "Laptop i konvertueshëm / 2-në-1",
    "Convertible / 2-in-1",
    "Convertible / 2-in-1",
  ],
  ["desktop", "Kompjuter desktop", "Desktop PC", "Desktop-PC"],
  ["gaming_pc", "Kompjuter për lojëra", "Gaming PC", "Gaming-PC"],
  ["all_in_one", "Kompjuter gjithçka-në-një", "All-in-one PC", "All-in-One-PC"],
  ["mini_pc", "Mini PC", "Mini PC", "Mini-PC"],
  ["other", "Tjetër", "Other", "Sonstige"],
];
const definitions = [
  {
    key: "brand",
    filterDisplay: "DROPDOWN",
    names: { sq: "Marka", en: "Brand", de: "Marke" },
    options: [
      ...brands.map((name) => ({
        value: name.toLowerCase(),
        labels: { sq: name, en: name, de: name },
      })),
      { value: "other", labels: { sq: "Tjetër", en: "Other", de: "Sonstige" } },
    ],
  },
  {
    key: "type",
    filterDisplay: "RADIO",
    names: { sq: "Lloji", en: "Type", de: "Typ" },
    options: types.map(([value, sq, en, de]) => ({ value, labels: { sq, en, de } })),
  },
  {
    key: "operating_system",
    filterDisplay: "RADIO",
    names: { sq: "Sistemi operativ", en: "Operating system", de: "Betriebssystem" },
    options: [
      ...["Windows", "macOS", "ChromeOS", "Linux"].map((name) => ({
        value: name.toLowerCase(),
        labels: { sq: name, en: name, de: name },
      })),
      { value: "other", labels: { sq: "Tjetër", en: "Miscellaneous", de: "Sonstige" } },
    ],
  },
  {
    key: "screen_size",
    filterDisplay: "RADIO",
    dependsOnId: "computers-type",
    names: {
      sq: "Madhësia e ekranit (inç)",
      en: "Screen size (inches)",
      de: "Bildschirmgröße (Zoll)",
    },
    options: [
      ["up_to_12", "Deri në 12″", "Up to 12″", "Bis 12″"],
      ["13", "13″", "13″", "13″"],
      ["14", "14″", "14″", "14″"],
      ["15", "15″", "15″", "15″"],
      ["16", "16″", "16″", "16″"],
      ["17_plus", "17″ e lart", "17″ and up", "Ab 17″"],
    ].map(([value, sq, en, de]) => ({
      value,
      labels: { sq, en, de },
      parentValues: ["laptop", "gaming_laptop", "convertible_2_in_1"],
    })),
  },
  {
    key: "processor",
    filterDisplay: "DROPDOWN",
    names: { sq: "Procesori", en: "Processor", de: "Prozessor" },
    options: [
      "AMD Ryzen 3",
      "AMD Ryzen 5",
      "AMD Ryzen 7",
      "AMD Ryzen 9",
      "Apple M1",
      "Apple M2",
      "Apple M3",
      "Apple M4",
      "Intel Core i3",
      "Intel Core i5",
      "Intel Core i7",
      "Intel Core i9",
      "Intel Core Ultra 5",
      "Intel Core Ultra 7",
      "Intel Core Ultra 9",
      "Qualcomm Snapdragon X",
    ]
      .map((name) => ({
        value: name.toLowerCase().replaceAll(" ", "_"),
        labels: { sq: name, en: name, de: name },
      }))
      .concat({
        value: "other",
        labels: { sq: "Procesor tjetër", en: "Other processor", de: "Anderer Prozessor" },
      }),
  },
  {
    key: "storage",
    filterDisplay: "RADIO",
    names: {
      sq: "Hapësira e ruajtjes (GB)",
      en: "Storage (GB)",
      de: "Speicherplatz (GB)",
    },
    options: [
      ["128", "128 GB"],
      ["256", "256 GB"],
      ["512", "512 GB"],
      ["1024", "1 TB"],
      ["2048", "2 TB"],
    ]
      .map(([value, name]) => ({ value, labels: { sq: name, en: name, de: name } }))
      .concat({ value: "other", labels: { sq: "Tjetër", en: "Other", de: "Sonstige" } }),
  },
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.table(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "computers" },
        include: { attributes: true },
      });
      if (!category.active || category.ownerPortal !== "SHITJAKOS") {
        throw new Error("Expected the active Computers category.");
      }
      const results = [];
      for (const [index, definition] of definitions.entries()) {
        // Preserve existing fields, stable answers and later administrator edits.
        if (category.attributes.some((field) => field.key === definition.key)) {
          results.push({ field: definition.key, status: "Already exists; preserved" });
          continue;
        }
        const { names, ...data } = definition;
        await tx.attributeDefinition.create({
          data: {
            ...data,
            id: `computers-${definition.key}`,
            categoryId: category.id,
            type: "SELECT",
            required: false,
            filterable: true,
            sortOrder: index - 2,
            translations: {
              create: Object.entries(names).map(([locale, label]) => ({ locale, label })),
            },
          },
        });
        results.push({
          field: definition.key,
          status: "Created",
          choices: definition.options.length,
        });
      }
      return results;
    }),
  );
} finally {
  await db.$disconnect();
}
