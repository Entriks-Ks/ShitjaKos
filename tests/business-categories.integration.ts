import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
const engine = await PGlite.create({ extensions: { pg_trgm, unaccent } });
const server = new PGLiteSocketServer({ db: engine, port: 0, host: "127.0.0.1" });
let disconnect: (() => Promise<void>) | undefined;
try {
  for (const entry of (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name)))
    await engine.exec(
      await readFile(`prisma/migrations/${entry.name}/migration.sql`, "utf8"),
    );
  await server.start();
  process.env.DATABASE_URL = `postgresql://postgres:postgres@${server.getServerConn()}/postgres?sslmode=disable`;
  const { getPrisma } = await import("../src/lib/prisma");
  const { createBusiness, updateBusiness, deleteBusiness } =
    await import("../src/services/businesses");
  const { getPublicShops } = await import("../src/repositories/shops");
  const { apiShops, apiMembership } = await import("../src/app/api/v1/_shared/data");
  const db = getPrisma();
  disconnect = () => db.$disconnect();
  for (const id of ["owner", "staff", "other"])
    await db.user.create({
      data: { id, name: id, email: `${id}@example.invalid`, emailVerified: true },
    });
  await db.category.createMany({
    data: [
      { id: "a", slug: "a" },
      { id: "b", slug: "b" },
      { id: "inactive", slug: "inactive", active: false },
      { id: "external", slug: "external", ownerPortal: "OTHER" },
    ],
  });
  await db.category.create({ data: { id: "child", slug: "child", parentId: "a" } });
  const owner = { id: "owner", role: "USER", suspendedAt: null };
  const input = {
    legalName: "Example Shop LLC",
    publicName: "Example Shop",
    city: "Prishtina",
    phone: "+38344123456",
    email: "shop@example.invalid",
    description: "A business with multiple product categories.",
    address: "",
    openingHours: "",
    categoryIds: ["a", "b"],
  };
  const id = await createBusiness(owner, input);
  assert.deepEqual(
    (
      await db.businessCategory.findMany({
        where: { businessId: id },
        orderBy: { position: "asc" },
      })
    ).map((r) => r.categoryId),
    ["a", "b"],
  );
  assert.equal((await getPublicShops({ category: "a" })).length, 0);
  await db.business.update({ where: { id }, data: { reviewStatus: "APPROVED" } });
  assert.equal((await getPublicShops({ category: "a", city: "Prishtina" })).length, 1);
  assert.equal((await getPublicShops({ category: "a", city: "Peja" })).length, 0);
  assert.equal((await apiShops(1, 20, { category: "b" })).length, 1);
  assert.equal((await apiMembership("owner", id))?.business.categories.length, 2);
  for (const categoryIds of [["a", "a"], ["inactive"], ["external"], ["child"], []])
    await assert.rejects(updateBusiness(owner, id, { categoryIds }));
  await db.businessMembership.create({
    data: { businessId: id, userId: "staff", role: "STAFF" },
  });
  await assert.rejects(
    updateBusiness({ id: "staff", role: "USER", suspendedAt: null }, id, {
      categoryIds: ["b"],
    }),
  );
  await assert.rejects(
    updateBusiness({ id: "other", role: "USER", suspendedAt: null }, id, {
      categoryIds: ["b"],
    }),
  );
  await updateBusiness(owner, id, { categoryIds: ["b"] });
  assert.equal((await getPublicShops({ category: "a" })).length, 0);
  await updateBusiness(owner, id, { publicName: "Renamed Shop" });
  assert.equal((await getPublicShops({ q: "Renamed" })).length, 1);
  assert.equal((await getPublicShops({ q: "bilete" })).length, 0);
  assert.equal(await db.businessCategory.count({ where: { businessId: id } }), 1);
  await db.business.update({ where: { id }, data: { suspendedAt: new Date() } });
  await assert.rejects(updateBusiness(owner, id, { categoryIds: ["a"] }));
  await db.business.update({ where: { id }, data: { suspendedAt: null } });
  await db.category.update({ where: { id: "b" }, data: { active: false } });
  assert.equal((await getPublicShops({ category: "b" })).length, 0);
  assert.equal((await getPublicShops())[0].business.categories.length, 0);
  await deleteBusiness(owner, id);
  assert.equal(await db.businessCategory.count({ where: { businessId: id } }), 0);
  const indexes = await db.$queryRaw<
    Array<{ indexname: string }>
  >`SELECT indexname FROM pg_indexes WHERE indexname IN ('Listing_title_trgm_idx','Listing_description_trgm_idx','Category_slug_trgm_idx','CategoryTranslation_name_trgm_idx')`;
  assert.equal(indexes.length, 4);
  console.log(
    "Business category integration passed: ownership, validation, order, edits, public/mobile filtering, archive handling, deletion, restored search indexes.",
  );
} finally {
  await disconnect?.();
  await server.stop();
  await engine.close();
}
