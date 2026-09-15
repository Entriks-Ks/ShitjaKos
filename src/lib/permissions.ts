export type Actor = { id: string; suspendedAt: Date | null; role: string };
export function canManageListing(
  actor: Actor,
  listing: {
    personalProfile: { userId: string } | null;
    business: { memberships: { userId: string; role: string }[] } | null;
  },
) {
  return (
    !actor.suspendedAt &&
    (listing.personalProfile?.userId === actor.id ||
      !!listing.business?.memberships.some(
        (m) => m.userId === actor.id && ["OWNER", "MANAGER"].includes(m.role),
      ))
  );
}
export function isStaff(actor: Actor) {
  return !actor.suspendedAt && actor.role === "ADMIN";
}
export function canTransition(from: string, to: string) {
  return (
    (
      {
        DRAFT: ["PUBLISHED"],
        PUBLISHED: ["PAUSED", "SOLD", "CLOSED"],
        PAUSED: ["PUBLISHED", "SOLD", "CLOSED"],
        SOLD: [],
        CLOSED: [],
      } as Record<string, string[]>
    )[from]?.includes(to) ?? false
  );
}
