import Link from "@/components/navigation-link";
import Image from "next/image";
import { MapPin, ArrowUpRight, Package, Heart } from "lucide-react";
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
  return (
    <article className="listing-card group">
      <Link className="listing-card-main" href={`/listings/${item.id}?lang=${locale}`}>
        <div className="card-photo">
          {item.media[0] ? (
            <Image
              unoptimized
              src={`/api/media/${item.media[0].id}?size=thumb`}
              alt={item.media[0].altText}
              fill
              sizes="(max-width: 640px) 100vw, 25vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <Package size={40} className="text-stone-300" />
          )}
          <span className="photo-label">
            {item.intent === "WANTED"
              ? "Kërkohet · Wanted"
              : item.business
                ? "Biznes"
                : "Privat"}
          </span>
        </div>
        <div className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-stone-400 mb-2">
            {translated(item.category.translations, locale)}
          </div>
          <h3 className="font-semibold truncate">{item.title}</h3>
          <div className="font-bold text-lg mt-2">{money(item.priceCents)}</div>
          <div className="flex justify-between mt-4 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <MapPin size={13} />
              {item.city}
            </span>
            <ArrowUpRight size={16} />
          </div>
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
            <Heart size={18} />
          </Link>
        )}
      </div>
    </article>
  );
}
