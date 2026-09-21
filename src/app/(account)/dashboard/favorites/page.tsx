import Link from "@/components/navigation-link";
import { requireUser } from "@/lib/session";
import { getVisibleFavorites } from "@/repositories/favorites";

export default async function FavoritesPage() {
  const user = await requireUser();
  const favorites = await getVisibleFavorites(user.id);

  return (
    <section className="workspace-section">
      <h1>My favorites</h1>

      {favorites.length === 0 ? (
        <p>You have no saved listings yet.</p>
      ) : (
        <ul>
          {favorites.map(({ listing }) => (
            <li key={listing.id}>
              <Link href={`/listings/${listing.id}`}>{listing.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
