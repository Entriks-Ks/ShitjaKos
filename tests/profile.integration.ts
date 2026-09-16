import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../src/lib/prisma";
import { updateProfile } from "../src/services/profile";

const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
assert.equal(target.hostname, "localhost");
assert.equal(target.port, "51214");
const db = getPrisma();
const id = randomUUID();
const otherId = randomUUID();
const actor = { id, role: "USER", suspendedAt: null };
const input = {
  name: "Updated Name",
  displayName: "My seller name",
  city: "Prishtina",
  bio: "Hello buyers",
  phone: "+383 44 123 456",
};
try {
  await db.user.createMany({
    data: [id, otherId].map((id) => ({
      id,
      name: "Original",
      email: `${id}@example.test`,
    })),
  });
  await updateProfile(actor, {
    ...input,
    userId: otherId,
    role: "ADMIN",
    email: "changed@example.test",
  });
  const saved = await db.user.findUniqueOrThrow({
    where: { id },
    include: { profile: true },
  });
  assert.equal(saved.name, input.name);
  assert.equal(saved.profile?.phone, input.phone);
  assert.equal(saved.profile?.displayName, input.displayName);
  assert.equal(saved.role, "USER");
  assert.equal(saved.email, `${id}@example.test`);
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: otherId } })).name,
    "Original",
  );
  await assert.rejects(updateProfile(actor, { ...input, phone: "invalid" }));
  await updateProfile(actor, { ...input, phone: "" });
  assert.equal(
    (await db.personalProfile.findUniqueOrThrow({ where: { userId: id } })).phone,
    "",
  );
  await db.user.update({ where: { id }, data: { suspendedAt: new Date() } });
  await assert.rejects(updateProfile(actor, input), /unavailable/);
  console.log(
    "Profile persistence, validation, ownership, and suspension checks passed.",
  );
} finally {
  await db.auditEvent.deleteMany({ where: { actorId: { in: [id, otherId] } } });
  await db.personalProfile.deleteMany({ where: { userId: { in: [id, otherId] } } });
  await db.user.deleteMany({ where: { id: { in: [id, otherId] } } });
  await db.$disconnect();
}
