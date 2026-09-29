import Link from "@/components/navigation-link";
import { Heart, MapPin, MessageCircle, Phone, ShieldCheck, Store } from "lucide-react";
import { copy, countryForCity, countryName, Locale, money } from "@/lib/catalog";
import { FavoriteButton } from "@/components/favorite-button";
import { MessageSeller } from "@/components/messaging/message-seller";
import { ShareListingButton } from "@/components/share-listing-button";
import styles from "./listing-detail.module.css";

type Labels = (typeof copy)[Locale];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function ListingSummary({
  id,
  locale,
  title,
  categoryName,
  intent,
  priceCents,
  negotiable,
  city,
  listedOn,
  sellerName,
  isBusiness,
  businessReviewed,
  shopSlug,
  sellerLogo,
  phone,
  visible,
  owner,
  signedIn,
  saved,
  labels,
}: {
  id: string;
  locale: Locale;
  title: string;
  categoryName: string;
  intent: string;
  priceCents: number | null;
  negotiable: boolean;
  city: string;
  listedOn: string;
  sellerName: string;
  isBusiness: boolean;
  businessReviewed: boolean;
  shopSlug?: string;
  sellerLogo?: string | null;
  phone?: string | null;
  visible: boolean;
  owner: boolean;
  signedIn: boolean;
  saved: boolean;
  labels: Labels;
}) {
  const country = countryForCity(city);
  const place = country ? `${city}, ${countryName(country, locale)}` : city;
  const loginHref = "/login";
  const intentLabel = intent === "WANTED" ? labels.wanted : labels.forSale;
  const sellerKind = isBusiness ? labels.business : labels.private;

  return (
    <div className={styles.summary}>
      <section className={styles.product}>
        <p className={styles.kicker}>
          <span>{categoryName}</span>
          <span className={styles.intentTag}>{intentLabel}</span>
        </p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.price}>
          {money(priceCents)}
          {negotiable ? <span className={styles.negotiable}>{labels.negotiable}</span> : null}
        </p>
        <dl className={styles.stats}>
          <div>
            <dt>{labels.location}</dt>
            <dd>
              <MapPin size={14} aria-hidden="true" />
              {place}
            </dd>
          </div>
          <div>
            <dt>{labels.listed}</dt>
            <dd>{listedOn}</dd>
          </div>
        </dl>
      </section>

      {visible && (
        <div className={styles.actions}>
          {!owner &&
            (signedIn ? (
              <MessageSeller
                listingId={id}
                listingTitle={title}
                buttonClassName={styles.toolMain}
                label={labels.messageSeller}
              />
            ) : (
              <Link className={styles.toolMain} href={loginHref}>
                <MessageCircle size={16} aria-hidden="true" />
                {labels.messageSeller}
              </Link>
            ))}
          {signedIn ? (
            <FavoriteButton
              listingId={id}
              initialSaved={saved}
              buttonClassName={styles.toolQuiet}
              label={labels.saveListing}
            />
          ) : (
            <Link className={styles.toolQuiet} href={loginHref} aria-label={labels.saveListing}>
              <Heart size={15} aria-hidden="true" />
              {labels.saveListing}
            </Link>
          )}
          <ShareListingButton
            title={title}
            buttonClassName={styles.toolQuiet}
            label={labels.shareListing}
          />
        </div>
      )}

      <section className={styles.contact} aria-label={labels.seller}>
        <div className={styles.who}>
          {sellerLogo ? (
            <img className={styles.avatar} src={sellerLogo} alt="" />
          ) : (
            <div className={styles.avatarFallback} aria-hidden="true">
              {initials(sellerName).toUpperCase() || <Store size={20} />}
            </div>
          )}
          <div className={styles.whoText}>
            <p className={styles.whoName}>{sellerName}</p>
            <p className={styles.whoKind}>
              {businessReviewed ? <ShieldCheck size={13} aria-hidden="true" /> : null}
              {sellerKind}
            </p>
          </div>
        </div>

        {owner && (
          <Link className={styles.contactMain} href={`/listings/${id}/edit`}>
            {labels.manageListing}
          </Link>
        )}

        {visible && !owner && (
          <div className={styles.contactBtns}>
            {shopSlug ? (
              <Link
                className={styles.contactMain}
                href={`/shops/${shopSlug}?lang=${locale}`}
              >
                {labels.visitShop}
              </Link>
            ) : null}
            {phone ? (
              <a className={styles.contactPhone} href={`tel:${phone}`}>
                <Phone size={16} aria-hidden="true" />
                {phone}
              </a>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
