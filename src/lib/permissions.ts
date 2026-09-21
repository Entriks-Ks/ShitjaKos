export type Actor = { id: string; suspendedAt: Date | null; role: string };
export function assertBusinessDeletionAllowed(
  actor: Actor,
  membership: { userId: string; role: string } | null,
  listingCount: number,
) {
  if (
    actor.suspendedAt ||
    membership?.userId !== actor.id ||
    membership.role !== "OWNER"
  ) {
    throw new Error("Only the active business owner can delete this shop.");
  }
  if (listingCount > 0) {
    throw new Error(
      "Delete this shop's listings first, including drafts, sold, and closed listings.",
    );
  }
}
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
