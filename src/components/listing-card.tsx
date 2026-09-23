import Link from "@/components/navigation-link";
import Image from "next/image";
import { MapPin, Package, Heart } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { Locale, money, translated } from "@/lib/catalog";
export type CardListing = {
  id: string;
  title: string;
  priceCents: number | null;
  city: string;
  intent: string;
  media: { id: string; altText: string }[];
  category: { translations: { locale: string; name: string }[] };
  business: { publicName: string; reviewStatus: string } | null;
};
export function ListingCard({
  item,
  locale,
  viewerSignedIn,
  saved = false,
}: {
  item: CardListing;
  locale: Locale;
  viewerSignedIn: boolean;
  saved?: boolean;
}) {
  const kind =
    item.intent === "WANTED" ? "Kërkohet · Wanted" : item.business ? "Biznes" : "Privat";
  return (
    <article className="listing-card">
      <Link className="listing-card-main" href={`/listings/${item.id}?lang=${locale}`}>
        <div className="card-photo">
          {item.media[0] ? (
            <Image
              unoptimized
              src={`/api/media/${item.media[0].id}?size=thumb`}
              alt={item.media[0].altText}
              fill
              sizes="(max-width: 640px) 100vw, 25vw"
              className="object-cover"
            />
          ) : (
            <Package size={36} />
          )}
          <span className="photo-label">{kind}</span>
        </div>
        <div className="listing-card-body">
          <p className="listing-card-category">
            {translated(item.category.translations, locale)}
          </p>
          <h3 className="listing-card-title">{item.title}</h3>
          <p className="listing-card-price">{money(item.priceCents)}</p>
          <p className="listing-card-city">
            <MapPin size={13} />
            {item.city}
          </p>
        </div>
      </Link>
      <div className="listing-card-favorite">
        {viewerSignedIn ? (
          <FavoriteButton listingId={item.id} initialSaved={saved} compact />
        ) : (
          <Link
            className="card-favorite-button"
            href="/login"
            aria-label="Sign in to save listing"
            title="Sign in to save listing"
          >
            <Heart size={16} />
          </Link>
        )}
      </div>
    </article>
  );
}
