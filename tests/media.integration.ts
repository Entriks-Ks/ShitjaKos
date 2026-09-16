import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getPrisma } from "../src/lib/prisma";
import { addListingPhoto, deleteListingPhoto } from "../src/services/media";
import { getListingPhotoResponse } from "../src/services/media-delivery";
import { access } from "node:fs/promises";

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
    create: { width: 1200, height: 900, channels: 3, background: "#237a61" },
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
  assert.equal(afterUpload.moderationStatus, "APPROVED");
  assert.equal(uploaded.position, 0);

  await db.listing.update({ where: { id: listing.id }, data: { status: "PUBLISHED" } });
  const requestPhoto = (etag?: string, signedIn = false) =>
    getListingPhotoResponse(
      new Request(`http://localhost/api/media/${mediaId}?size=thumb`, {
        headers: etag ? { "if-none-match": etag } : {},
      }),
      mediaId,
      async () => (signedIn ? actor : null),
    );
  const photo = await requestPhoto();
  assert.equal(photo.status, 200);
  assert.equal(
    (await sharp(Buffer.from(await photo.arrayBuffer())).metadata()).width,
    480,
  );
  const etag = photo.headers.get("etag")!;
  assert.ok(etag);
  assert.equal((await requestPhoto(etag)).status, 304);
  await db.listing.update({ where: { id: listing.id }, data: { status: "PAUSED" } });
  assert.equal(
    (await requestPhoto(etag)).status,
    404,
    "Cached public image cannot bypass pausing",
  );
  const ownerPhoto = await requestPhoto(etag, true);
  assert.equal(ownerPhoto.status, 200);
  assert.equal(ownerPhoto.headers.get("cache-control"), "private, no-store");
  await db.listing.update({ where: { id: listing.id }, data: { status: "PUBLISHED" } });
  await db.user.update({ where: { id }, data: { suspendedAt: new Date() } });
  assert.equal(
    (await requestPhoto(etag)).status,
    404,
    "Cached public image cannot bypass suspension",
  );
  await db.user.update({ where: { id }, data: { suspendedAt: null } });

  await deleteListingPhoto(actor, listing.id, mediaId);
  await assert.rejects(
    access(join(process.cwd(), ".uploads", "thumbnails", uploaded.storageKey)),
  );
  assert.equal(await db.listingMedia.count({ where: { listingId: listing.id } }), 0);
  assert.equal(
    (await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).version,
    listing.version + 2,
  );
  assert.equal(await db.auditEvent.count({ where: { actorId: id } }), 2);
  console.log(
    "Media integration passed: ownership, upload, thumbnails, HTTP cache validation, pause/suspension protection, deletion, and audit.",
  );
} finally {
  if (listingId) {
    const remaining = await db.listingMedia.findMany({ where: { listingId } });
    for (const media of remaining) {
      await unlink(join(process.cwd(), ".uploads", media.storageKey)).catch(() => {});
      await unlink(join(process.cwd(), ".uploads", "thumbnails", media.storageKey)).catch(
        () => {},
      );
    }
    await db.listing.deleteMany({ where: { id: listingId } });
  }
  await db.personalProfile.deleteMany({ where: { userId: id } });
  await db.auditEvent.deleteMany({ where: { actorId: id } });
  await db.user.deleteMany({ where: { id } });
  await db.$disconnect();
}
