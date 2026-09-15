import "dotenv/config";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { validateAttributes } from "../src/lib/validations/listing";

const namespace = "shitjakos-demo-v1";
const sellerId = `${namespace}-user`;
const profileId = `${namespace}-profile`;
const auditId = `${namespace}-audit`;
const demoEmail = "demo-seller@shitjakos.invalid";
const uploadsDirectory = join(process.cwd(), ".uploads");

type Sample = {
  categoryId: string;
  title: string;
  priceEuros: number | null;
  city: string;
  condition: "NEW" | "LIKE_NEW" | "USED";
  intent?: "FOR_SALE" | "WANTED";
};

const samples: Sample[] = [
  {
    categoryId: "phones",
    title: "[Demo] Samsung Galaxy A54",
    priceEuros: 195,
    city: "Prishtina",
    condition: "USED",
  },
  {
    categoryId: "phones",
    title: "[Demo] iPhone 13 with case",
    priceEuros: 340,
    city: "Prizren",
    condition: "LIKE_NEW",
  },
  {
    categoryId: "computers",
    title: "[Demo] Lightweight laptop",
    priceEuros: 420,
    city: "Ferizaj",
    condition: "USED",
  },
  {
    categoryId: "computers",
    title: "[Demo] Desktop computer setup",
    priceEuros: 580,
    city: "Peja",
    condition: "LIKE_NEW",
  },
  {
    categoryId: "gaming",
    title: "[Demo] Game console bundle",
    priceEuros: 260,
    city: "Gjakova",
    condition: "USED",
  },
  {
    categoryId: "audio",
    title: "[Demo] Wireless headphones",
    priceEuros: 65,
    city: "Gjilan",
    condition: "LIKE_NEW",
  },
  {
    categoryId: "tvs",
    title: "[Demo] Compact television",
    priceEuros: 180,
    city: "Mitrovica",
    condition: "USED",
  },
  {
    categoryId: "furniture",
    title: "[Demo] Wooden dining table",
    priceEuros: 150,
    city: "Prishtina",
    condition: "USED",
  },
  {
    categoryId: "furniture",
    title: "[Demo] Comfortable reading chair",
    priceEuros: 85,
    city: "Prizren",
    condition: "LIKE_NEW",
  },
  {
    categoryId: "appliances",
    title: "[Demo] Small coffee machine",
    priceEuros: 45,
    city: "Ferizaj",
    condition: "USED",
  },
  {
    categoryId: "appliances",
    title: "[Demo] Kitchen blender",
    priceEuros: 30,
    city: "Peja",
    condition: "NEW",
  },
  {
    categoryId: "garden",
    title: "[Demo] Garden tool set",
    priceEuros: 40,
    city: "Gjakova",
    condition: "USED",
  },
  {
    categoryId: "lighting",
    title: "[Demo] Modern desk lamp",
    priceEuros: 25,
    city: "Gjilan",
    condition: "LIKE_NEW",
  },
  {
    categoryId: "lighting",
    title: "[Demo] Floor lamp for living room",
    priceEuros: 55,
    city: "Mitrovica",
    condition: "USED",
  },
  {
    categoryId: "toys",
    title: "[Demo] Building blocks set",
    priceEuros: 20,
    city: "Prishtina",
    condition: "USED",
  },
  {
    categoryId: "baby",
    title: "[Demo] Foldable baby stroller",
    priceEuros: 115,
    city: "Prizren",
    condition: "LIKE_NEW",
  },
  {
    categoryId: "outdoors",
    title: "[Demo] Adjustable dumbbells",
    priceEuros: 70,
    city: "Ferizaj",
    condition: "USED",
  },
  {
    categoryId: "outdoors",
    title: "[Demo] Weekend camping tent",
    priceEuros: 90,
    city: "Peja",
    condition: "LIKE_NEW",
  },
  {
    categoryId: "books-media",
    title: "[Demo] Collection of novels",
    priceEuros: 24,
    city: "Gjakova",
    condition: "USED",
  },
  {
    categoryId: "books-media",
    title: "[Demo] Children's picture books",
    priceEuros: 15,
    city: "Gjilan",
    condition: "LIKE_NEW",
  },
  {
    categoryId: "instruments",
    title: "[Demo] Acoustic guitar",
    priceEuros: 110,
    city: "Mitrovica",
    condition: "USED",
  },
  {
    categoryId: "power-tools",
    title: "[Demo] Cordless drill kit",
    priceEuros: 75,
    city: "Prishtina",
    condition: "LIKE_NEW",
  },
  {
    categoryId: "power-tools",
    title: "[Demo] Electric sander",
    priceEuros: 55,
    city: "Prizren",
    condition: "USED",
  },
  {
    categoryId: "power-tools",
    title: "[Demo] Hand tools for repairs",
    priceEuros: 35,
    city: "Vushtrri",
    condition: "USED",
  },
];

function listingId(index: number) {
  return `${namespace}-listing-${String(index + 1).padStart(2, "0")}`;
}

function mediaId(index: number) {
  return `${namespace}-media-${String(index + 1).padStart(2, "0")}`;
}

function imageKey(index: number) {
  return `${namespace}-${String(index + 1).padStart(2, "0")}.webp`;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character];
  });
}

async function imageFor(sample: Sample, index: number) {
  const colors = [
    ["#184e47", "#58ad91"],
    ["#385069", "#8cb3d4"],
    ["#76504b", "#dda38e"],
    ["#555279", "#aea9e2"],
  ];
  const [dark, light] = colors[index % colors.length];
  const title = escapeXml(sample.title.replace(/^\[Demo\]\s*/, "").slice(0, 31));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${dark}" />
          <stop offset="1" stop-color="${light}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#background)" />
      <circle cx="1015" cy="165" r="330" fill="#ffffff" opacity="0.09" />
      <circle cx="140" cy="810" r="310" fill="#ffffff" opacity="0.08" />
      <rect x="70" y="78" width="226" height="55" rx="27" fill="#ffffff" opacity="0.22" />
      <text x="102" y="116" fill="#ffffff" font-family="Arial, sans-serif" font-size="27" font-weight="bold">SAMPLE ITEM</text>
      <text x="75" y="495" fill="#ffffff" font-family="Arial, sans-serif" font-size="164" font-weight="bold">DEMO</text>
      <text x="80" y="620" fill="#ffffff" font-family="Arial, sans-serif" font-size="55" font-weight="bold">${title}</text>
      <text x="82" y="788" fill="#ffffff" opacity="0.82" font-family="Arial, sans-serif" font-size="27">ShitjaKos · interface preview</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
}

function sampleAttributes(
  definitions: Parameters<typeof validateAttributes>[0],
  title: string,
) {
  const answers = Object.fromEntries(
    definitions.map((definition) => {
      if (definition.type === "SELECT") {
        const first = (definition.options as { value: string }[])[0]?.value;
        if (!first) throw new Error(`Selection field ${definition.key} has no choices.`);
        return [definition.id, first];
      }
      if (definition.type === "NUMBER") {
        const value = definition.min ?? Math.min(1, definition.max ?? 1);
        return [definition.id, value];
      }
      if (definition.type === "BOOLEAN") return [definition.id, false];
      return [definition.id, title.replace(/^\[Demo\]\s*/, "").slice(0, 180)];
    }),
  );
  return validateAttributes(definitions, answers);
}

async function ensureSeller(db: PrismaClient) {
  const existing = await db.user.findUnique({ where: { id: sellerId } });
  if (existing && existing.email !== demoEmail) {
    throw new Error("The reserved demo user ID belongs to another account.");
  }
  if (!existing) {
    await db.user.create({
      data: {
        id: sellerId,
        name: "ShitjaKos Demo Seller",
        email: demoEmail,
      },
    });
  }
  const profile = await db.personalProfile.findUnique({ where: { userId: sellerId } });
  if (profile && profile.id !== profileId) {
    throw new Error("The reserved demo user already has a different personal profile.");
  }
  await db.personalProfile.upsert({
    where: { userId: sellerId },
    create: {
      id: profileId,
      userId: sellerId,
      displayName: "ShitjaKos Demo Seller",
      city: "Prishtina",
      bio: "Sample content for testing the marketplace interface.",
    },
    update: {},
  });
}

async function seed(db: PrismaClient) {
  const categories = await db.category.findMany({
    where: {
      id: { in: samples.map((sample) => sample.categoryId) },
      active: true,
      ownerPortal: "SHITJAKOS",
      parentId: { not: null },
    },
    include: { attributes: true },
  });
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  for (const sample of samples) {
    if (!categoryById.has(sample.categoryId)) {
      throw new Error(`Missing subcategory ${sample.categoryId}. Run db:seed first.`);
    }
  }

  const reservedIds = samples.map((_, index) => listingId(index));
  const existingListings = await db.listing.findMany({
    where: { id: { in: reservedIds } },
    select: { id: true, createdById: true, personalProfileId: true },
  });
  if (
    existingListings.some(
      (listing) =>
        listing.createdById !== sellerId || listing.personalProfileId !== profileId,
    )
  ) {
    throw new Error("A reserved demo listing ID belongs to another seller or profile.");
  }
  const existingMedia = await db.listingMedia.findMany({
    where: { id: { in: samples.map((_, index) => mediaId(index)) } },
    select: { id: true, listingId: true, storageKey: true },
  });
  if (
    existingMedia.some((media) => {
      const index = Number(media.id.slice(-2)) - 1;
      return media.listingId !== listingId(index) || media.storageKey !== imageKey(index);
    })
  ) {
    throw new Error("A reserved demo image ID belongs to another listing.");
  }

  await ensureSeller(db);
  await mkdir(uploadsDirectory, { recursive: true });
  const now = Date.now();

  for (const [index, sample] of samples.entries()) {
    const id = listingId(index);
    const existing = await db.listing.findUnique({ where: { id } });

    const image = await imageFor(sample, index);
    await writeFile(join(uploadsDirectory, imageKey(index)), image);
    const publishedAt = new Date(now - index * 60 * 60 * 1000);
    const values = sampleAttributes(
      categoryById.get(sample.categoryId)!.attributes,
      sample.title,
    );
    const details = {
      categoryId: sample.categoryId,
      title: sample.title,
      description:
        "DEMO CONTENT — this sample listing is for interface testing only. " +
        "The item, price and illustration are not a real offer. " +
        `Example: ${sample.title.replace(/^\[Demo\]\s*/, "")}.`,
      priceCents: sample.priceEuros === null ? null : Math.round(sample.priceEuros * 100),
      city: sample.city,
      condition: sample.condition,
      intent: sample.intent ?? ("FOR_SALE" as const),
      status: "PUBLISHED" as const,
      moderationStatus: "APPROVED" as const,
      publishedAt,
      phoneVisible: false,
      contactPhone: null,
    };

    if (existing) {
      await db.listing.update({ where: { id }, data: details });
    } else {
      await db.listing.create({
        data: {
          id,
          ...details,
          createdById: sellerId,
          personalProfileId: profileId,
        },
      });
    }

    for (const value of values) {
      await db.listingAttributeValue.upsert({
        where: {
          listingId_attributeId: { listingId: id, attributeId: value.attributeId },
        },
        create: { listingId: id, ...value },
        update: { value: value.value },
      });
    }
    await db.listingMedia.upsert({
      where: { id: mediaId(index) },
      create: {
        id: mediaId(index),
        listingId: id,
        storageKey: imageKey(index),
        altText: `Demo illustration for ${sample.title}`,
        position: 0,
      },
      update: {
        altText: `Demo illustration for ${sample.title}`,
      },
    });
  }

  await db.auditEvent.upsert({
    where: { id: auditId },
    create: {
      id: auditId,
      actorId: sellerId,
      action: "demo-content.seeded",
      targetId: namespace,
      detail: { listings: samples.length, purpose: "interface preview" },
    },
    update: { detail: { listings: samples.length, purpose: "interface preview" } },
  });
  console.log(
    `Added ${samples.length} clearly labeled demo listings with illustrations.`,
  );
}

async function clear(db: PrismaClient) {
  const ids = samples.map((_, index) => listingId(index));
  const listings = await db.listing.findMany({
    where: { id: { in: ids } },
    select: { id: true, createdById: true },
  });
  if (listings.some((listing) => listing.createdById !== sellerId)) {
    throw new Error(
      "A reserved demo listing ID belongs to another user. Cleanup stopped.",
    );
  }
  const seller = await db.user.findUnique({ where: { id: sellerId } });
  if (seller && seller.email !== demoEmail) {
    throw new Error(
      "The reserved demo user ID belongs to another account. Cleanup stopped.",
    );
  }
  const extraListings = await db.listing.count({
    where: { createdById: sellerId, id: { notIn: ids } },
  });
  if (extraListings > 0) {
    throw new Error("The demo user has other listings. Cleanup stopped.");
  }
  await db.listing.deleteMany({ where: { id: { in: ids } } });
  await db.auditEvent.deleteMany({ where: { id: auditId } });
  await db.personalProfile.deleteMany({ where: { userId: sellerId } });
  await db.user.deleteMany({ where: { id: sellerId } });
  for (const [index] of samples.entries()) {
    await unlink(join(uploadsDirectory, imageKey(index))).catch(() => {});
  }
  console.log(`Removed ${listings.length} demo listings and their illustrations.`);
}

async function main() {
  const command = process.argv[2];
  if (command !== "seed" && command !== "clear") {
    throw new Error("Use npm run db:seed:demo or npm run db:clear:demo.");
  }
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env first.");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2 }),
  });
  try {
    if (command === "seed") await seed(db);
    else await clear(db);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Could not update demo content.",
  );
  process.exitCode = 1;
});
