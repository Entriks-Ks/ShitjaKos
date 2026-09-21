import Link from "@/components/navigation-link";
import { ArrowUpRight, Heart } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { EmptyState } from "@/components/workspace-ui";
import { requireUser } from "@/lib/session";
import { getVisibleFavorites } from "@/repositories/favorites";

export const metadata = {
  title: "My favorites",
  robots: { index: false, follow: false },
};

export default async function FavoritesPage() {
  const user = await requireUser();
  const favorites = await getVisibleFavorites(user.id);

  return (
    <>
      <header className="workspace-heading">
        <p className="eyebrow">YOUR SAVED FINDS</p>
        <h1>My favorites</h1>
        <p className="muted">Listings you saved to come back to later.</p>
      </header>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <h2>Saved listings</h2>
            <p>
              {favorites.length} {favorites.length === 1 ? "listing" : "listings"} saved
            </p>
          </div>
          <Link className="btn btn-outline" href="/search">
            Explore listings <ArrowUpRight size={16} />
          </Link>
        </div>

        {favorites.length ? (
          <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
            {favorites.map(({ listing }) => (
              <ListingCard
                key={listing.id}
                item={listing}
                locale="en"
                viewerSignedIn
                saved
              />
            ))}
          </div>
        ) : (
          <div className="workspace-card">
            <EmptyState icon={Heart} title="Nothing saved yet.">
              Tap the heart on any listing to keep it here.
            </EmptyState>
          </div>
        )}
      </section>
    </>
  );
}
