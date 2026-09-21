import { notFound } from "next/navigation";
import { ListingForm } from "@/components/listing-form";
import { requireUser } from "@/lib/session";
import { getEditableListing } from "@/repositories/listings";
import { getCachedCategories as getCategories } from "@/lib/catalog-cache";
import { canManageListing } from "@/lib/permissions";
import { DeleteListingButton } from "@/components/delete-listing-button";
export const metadata = {
  title: "Edit listing",
  robots: { index: false, follow: false },
};
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, item, categories] = await Promise.all([
    requireUser(),
    getEditableListing(id),
    getCategories(),
  ]);
  if (!item || !canManageListing(user, item)) notFound();
  return (
    <>
      <main className="wrap max-w-3xl py-10">
        <h1>Your listing.</h1>
        <p className="notice mb-6">
          Status: {item.status}. Save details before uploading photos.
        </p>
        {["SOLD", "CLOSED"].includes(item.status) ? (
          <p>This listing is closed and cannot be edited.</p>
        ) : (
          <ListingForm
            categories={categories}
            businesses={user.memberships.map((m) => m.business)}
            initial={{
              id: item.id,
              version: item.version,
              owner: item.businessId ?? "personal",
              categoryId: item.categoryId,
              intent: item.intent,
              title: item.title,
              description: item.description,
              price: String((item.priceCents ?? 0) / 100),
              condition: item.condition,
              city: item.city as "Prishtina",
              negotiable: item.negotiable,
              phoneVisible: item.phoneVisible,
              contactPhone: item.contactPhone ?? "",
              attributes: Object.fromEntries(
                item.attributes.map((a) => [a.attributeId, a.value]),
              ),
              media: item.media.map((m) => ({ id: m.id, altText: m.altText })),
              status: item.status,
              moderationStatus: item.moderationStatus,
            }}
          />
        )}
        <DeleteListingButton listingId={item.id} />
      </main>
    </>
  );
}
