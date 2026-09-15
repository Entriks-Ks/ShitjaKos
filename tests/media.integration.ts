import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getPrisma } from "../src/lib/prisma";
import { addListingPhoto, deleteListingPhoto } from "../src/services/media";

// Keep acceptance data in the isolated local database, never the hosted one.
const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
assert.equal(target.hostname, "localhost");
assert.equal(target.port, "51214");

const db = getPrisma();
const id = randomUUID();
const actor = { id, role: "USER", suspendedAt: null };
let listingId: string | undefined;

try {
  const category = await db.category.findFirst({ where: { parentId: { not: null } } });
  assert.ok(category, "Seed the local categories before running this test.");
  await db.user.create({
    data: {
      id,
      name: "Media test",
      email: `${id}@example.test`,
      emailVerified: true,
    },
  });
  const profile = await db.personalProfile.create({
    data: { userId: id, displayName: "Media test" },
  });
  const listing = await db.listing.create({
    data: {
      personalProfileId: profile.id,
      createdById: id,
      categoryId: category.id,
      title: "Temporary media test",
      description: "Temporary image upload integration test listing.",
      city: "Prishtina",
    },
  });
  listingId = listing.id;

  const png = await sharp({
    create: { width: 16, height: 16, channels: 3, background: "#237a61" },
  })
    .png()
    .toBuffer();
  const file = new File([new Uint8Array(png)], "test.png", { type: "image/png" });
  await assert.rejects(
    addListingPhoto({ ...actor, id: "another-user" }, listing.id, file),
    /Not allowed/,
  );
  const mediaId = await addListingPhoto(actor, listing.id, file);
  const uploaded = await db.listingMedia.findUniqueOrThrow({ where: { id: mediaId } });
  const afterUpload = await db.listing.findUniqueOrThrow({ where: { id: listing.id } });
  assert.equal(afterUpload.version, listing.version + 1);
  assert.equal(afterUpload.moderationStatus, "PENDING");
  assert.equal(uploaded.position, 0);

  await deleteListingPhoto(actor, listing.id, mediaId);
  assert.equal(await db.listingMedia.count({ where: { listingId: listing.id } }), 0);
  assert.equal(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).version,
    listing.version + 2,
  );
  assert.equal(await db.auditEvent.count({ where: { actorId: id } }), 2);
  console.log(
    "Media integration passed: ownership, upload, review reset, deletion, and audit.",
  );
} finally {
  if (listingId) {
    const remaining = await db.listingMedia.findMany({ where: { listingId } });
    for (const media of remaining) {
      await unlink(join(process.cwd(), ".uploads", media.storageKey)).catch(() => {});
    }
    await db.listing.deleteMany({ where: { id: listingId } });
  }
  await db.personalProfile.deleteMany({ where: { userId: id } });
  await db.auditEvent.deleteMany({ where: { actorId: id } });
  await db.user.deleteMany({ where: { id } });
  await db.$disconnect();
}
