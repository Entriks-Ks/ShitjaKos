import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const choices = [
  [
    "printers_scanners",
    "Printerë dhe skanerë",
    "Printers & Scanners",
    "Drucker & Scanner",
  ],
  [
    "hard_drives_drives",
    "Disqe të ngurta dhe lexues",
    "Hard drives & drives",
    "Festplatten & Laufwerke",
  ],
  ["cases", "Kasa kompjuteri", "Computer cases", "Gehäuse"],
  ["graphics_cards", "Karta grafike", "Graphics cards", "Grafikkarten"],
  ["cables_adapters", "Kabllo dhe përshtatës", "Cables & Adapters", "Kabel & Adapter"],
  ["motherboards", "Pllaka amë", "Motherboards", "Mainboards"],
  ["monitors", "Monitorë", "Monitors", "Monitore"],
  ["multimedia", "Multimedia", "Multimedia", "Multimedia"],
  ["network_modem", "Pajisje rrjeti dhe modemë", "Network & Modem", "Netzwerk & Modem"],
  ["processors", "Procesorë / CPU", "Processors / CPUs", "Prozessoren / CPUs"],
  ["software", "Programe kompjuterike", "Software", "Software"],
  ["memory", "Memorie RAM", "Memory", "Arbeitsspeicher"],
  ["keyboard_mouse", "Tastiera dhe maus", "Keyboard & Mouse", "Tastatur & Maus"],
  ["other", "Aksesorë të tjerë për PC", "Other PC accessories", "Weiteres PC-Zubehör"],
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.log(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "computer-parts" },
        include: { attributes: true },
      });
      if (
        !category.active ||
        category.parentId !== "electronics" ||
        category.ownerPortal !== "SHITJAKOS"
      ) {
        throw new Error("Expected active Electronics / Computer parts.");
      }
      // Preserve future administrator changes and listing answers on reruns.
      if (category.attributes.some((field) => field.key === "type")) {
        return "Computer parts Type already exists; preserved.";
      }
      await tx.attributeDefinition.create({
        data: {
          id: "computer-parts-type",
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
      return "Created Computer parts Type with 14 translated choices and RADIO search display.";
    }),
  );
} finally {
  await db.$disconnect();
}
