import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const choices = [
  [
    "office",
    "Office dhe produktivitet (Microsoft Office)",
    "Office & productivity (Microsoft Office)",
    "Office & Büro (Microsoft Office)",
  ],
  [
    "operating_systems",
    "Sisteme operative (Windows)",
    "Operating systems (Windows)",
    "Betriebssysteme (Windows)",
  ],
  [
    "cad",
    "CAD dhe projektim teknik (AutoCAD)",
    "CAD & technical design (AutoCAD)",
    "CAD & technische Planung (AutoCAD)",
  ],
  [
    "graphics_photo",
    "Dizajn grafik dhe fotografi (Photoshop)",
    "Graphic design & photo editing (Photoshop)",
    "Grafik & Bildbearbeitung (Photoshop)",
  ],
  [
    "video_animation",
    "Video dhe animacion",
    "Video editing & animation",
    "Videoschnitt & Animation",
  ],
  [
    "audio_music",
    "Audio dhe prodhim muzikor",
    "Audio & music production",
    "Audio & Musikproduktion",
  ],
  ["security", "Antivirus dhe siguri", "Antivirus & security", "Antivirus & Sicherheit"],
  [
    "accounting",
    "Kontabilitet dhe biznes",
    "Accounting & business",
    "Buchhaltung & Business",
  ],
  [
    "development",
    "Programim dhe zhvillim uebi",
    "Programming & web development",
    "Programmierung & Webentwicklung",
  ],
  [
    "education",
    "Edukim dhe gjuhë",
    "Education & language learning",
    "Lernsoftware & Sprachen",
  ],
  [
    "utilities",
    "Mjete sistemi dhe kopje rezervë",
    "System utilities & backup",
    "Systemprogramme & Backup",
  ],
  ["other", "Programe të tjera", "Other software", "Weitere Software"],
];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }),
});
try {
  console.log(
    await db.$transaction(async (tx) => {
      const category = await tx.category.findUniqueOrThrow({
        where: { id: "software" },
        include: { attributes: true },
      });
      if (
        !category.active ||
        category.parentId !== "electronics" ||
        category.ownerPortal !== "SHITJAKOS"
      ) {
        throw new Error("Expected active Electronics / Software.");
      }
      if (category.attributes.some((field) => field.key === "type")) {
        return "Software Type already exists; preserved.";
      }
      await tx.attributeDefinition.create({
        data: {
          id: "software-type",
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
      return "Created Software Type with 12 translated choices and RADIO search display.";
    }),
  );
} finally {
  await db.$disconnect();
}
