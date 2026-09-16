import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../src/lib/prisma";
import { saveListing, transitionListing } from "../src/services/listings";
import { reviewItem } from "../src/services/reviews";
import { getPublicListingMarker } from "../src/repositories/listings";

const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
assert.equal(target.hostname, "localhost");
assert.equal(target.port, "51214");
const db = getPrisma();
const id = randomUUID();
const reviewerId = randomUUID();
const groupId = randomUUID();
const categoryId = randomUUID();
const businessId = randomUUID();
const actor = { id, role: "USER", suspendedAt: null };
const reviewer = { id: reviewerId, role: "ADMIN", suspendedAt: null };
const input = {
  owner: "personal",
  categoryId,
  title: "Publication test listing",
  description: "A temporary listing to verify immediate publication.",
  intent: "FOR_SALE",
  price: "10",
  city: "Prishtina",
  condition: "USED",
  negotiable: false,
  phoneVisible: false,
  contactPhone: "",
  attributes: {},
};
try {
  await db.user.createMany({
    data: [id, reviewerId].map((id) => ({
      id,
      name: "Publication test",
      email: `${id}@example.test`,
      emailVerified: true,
    })),
  });
  await db.personalProfile.create({
    data: { userId: id, displayName: "Publication test" },
  });
  await db.category.create({ data: { id: groupId, slug: groupId } });
  await db.category.create({
    data: { id: categoryId, slug: categoryId, parentId: groupId },
  });
  const listingId = await saveListing(actor, input);
  assert.equal(await getPublicListingMarker(listingId), null, "Draft remains private");
  await assert.rejects(transitionListing(actor, listingId, "PUBLISHED"), /photo/);
  await db.listingMedia.create({
    data: { listingId, storageKey: `${id}.webp`, position: 0, altText: "Test photo" },
  });
  await assert.rejects(
    transitionListing({ ...actor, id: reviewerId }, listingId, "PUBLISHED"),
    /cannot change/,
  );
  await transitionListing(actor, listingId, "PUBLISHED");
  assert.ok(
    await getPublicListingMarker(listingId),
    "Personal listing is public without review",
  );
  const listing = await db.listing.findUniqueOrThrow({ where: { id: listingId } });
  await saveListing(actor, {
    ...input,
    id: listingId,
    version: listing.version,
    title: "Updated publication test",
  });
  assert.ok(await getPublicListingMarker(listingId), "Editing keeps it public");
  await transitionListing(actor, listingId, "PAUSED");
  assert.equal(await getPublicListingMarker(listingId), null);
  await transitionListing(actor, listingId, "PUBLISHED");
  assert.ok(await getPublicListingMarker(listingId), "Republishing needs no review");
  await db.business.create({
    data: {
      id: businessId,
      legalName: "Test",
      publicName: "Test",
      city: "Prishtina",
      phone: "123456789",
      email: `${id}@example.test`,
      description: "Test shop",
      memberships: { create: { userId: id, role: "OWNER" } },
    },
  });
  const businessListing = await saveListing(actor, { ...input, owner: businessId });
  await db.listingMedia.create({
    data: { listingId: businessListing, storageKey: `${businessId}.webp`, position: 0, altText: "Test photo" },
  });
  await assert.rejects(
    transitionListing(actor, businessListing, "PUBLISHED"),
    /business must be approved/,
  );
  await assert.rejects(
    reviewItem(
      { ...actor, role: "ADMIN" },
      { kind: "business", id: businessId, decision: "APPROVED", reason: "Test review" },
    ),
    /own business/,
  );
  await reviewItem(reviewer, {
    kind: "business",
    id: businessId,
    decision: "APPROVED",
    reason: "Test review",
  });
  await transitionListing(actor, businessListing, "PUBLISHED");
  assert.ok(
    await getPublicListingMarker(businessListing),
    "Approved business publishes without listing review",
  );
  await db.listing.update({
    where: { id: listingId },
    data: { moderationStatus: "REJECTED" },
  });
  assert.equal(
    await getPublicListingMarker(listingId),
    null,
    "Existing blocked listings stay hidden",
  );
  await transitionListing(actor, listingId, "PAUSED");
  await assert.rejects(transitionListing(actor, listingId, "PUBLISHED"), /blocked/);
  console.log(
    "Publication passed: immediate visibility, ownership, edits, pause/resume, blocked listings, and shop-only approval.",
  );
} finally {
  await db.listing.deleteMany({ where: { createdById: id } });
  await db.businessMembership.deleteMany({ where: { businessId } });
  await db.business.deleteMany({ where: { id: businessId } });
  await db.personalProfile.deleteMany({ where: { userId: id } });
  await db.auditEvent.deleteMany({ where: { actorId: { in: [id, reviewerId] } } });
  await db.user.deleteMany({ where: { id: { in: [id, reviewerId] } } });
  await db.category.deleteMany({ where: { id: categoryId } });
  await db.category.deleteMany({ where: { id: groupId } });
  await db.$disconnect();
}
