import Image from "next/image";
import Link from "@/components/navigation-link";
import { ArrowUpRight, BadgeCheck, Plus } from "lucide-react";
import type { Locale } from "@/lib/catalog";

const messages = {
  sq: {
    eyebrow: "ÇDO TREGIM NIS ME DIÇKA TË VOGËL.",
    title: "Ende nuk ka shpallje",
    description:
      "Pak hapësirë, shumë mundësi. Jepi një fillim të ri gjërave që nuk i përdor më — dikush këtu po i kërkon.",
    action: "Publiko shpalljen e parë",
    how: "Si funksionon",
    reassurance: "Falas për të publikuar. Lehtë për t’u lidhur.",
    steps: [
      "Shto fotot dhe përshkrimin e artikullit.",
      "Publiko shpalljen që blerësit ta gjejnë.",
      "Bisedo me blerësit dhe organizoni shitjen.",
    ],
  },
  en: {
    eyebrow: "EVERY STORY STARTS WITH SOMETHING SMALL.",
    title: "No listings yet",
    description:
      "A little space, a lot of possibilities. Give the things you no longer use a fresh start — someone here is looking for them.",
    action: "Publish the first listing",
    how: "How it works",
    reassurance: "Free to publish. Easy to connect.",
    steps: [
      "Add photos and a description of your item.",
      "Publish your listing so buyers can find it.",
      "Chat with buyers and arrange the sale.",
    ],
  },
  de: {
    eyebrow: "JEDE GESCHICHTE BEGINNT MIT ETWAS KLEINEM.",
    title: "Noch keine Anzeigen",
    description:
      "Ein wenig Platz, viele Möglichkeiten. Gib Dingen, die du nicht mehr nutzt, einen neuen Anfang — jemand hier sucht danach.",
    action: "Erste Anzeige veröffentlichen",
    how: "So funktioniert’s",
    reassurance: "Kostenlos veröffentlichen. Einfach in Kontakt kommen.",
    steps: [
      "Füge Fotos und eine Beschreibung hinzu.",
      "Veröffentliche die Anzeige, damit Käufer sie finden.",
      "Schreibe mit Käufern und vereinbare den Verkauf.",
    ],
  },
};

export function EmptyListings({
  locale = "sq",
  title,
  description,
  actionLabel,
  actionHref = "/listings/new",
  className = "",
}: {
  locale?: Locale;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  const text = messages[locale];
  return (
    <section className={`empty-listings ${className}`}>
      <Image
        className="empty-listings-art"
        src="/illustrations/empty-listings.svg"
        width={500}
        height={300}
        alt=""
        unoptimized
      />
      <p className="empty-listings-eyebrow">{text.eyebrow}</p>
      <h2>{title ?? text.title}</h2>
      <p className="empty-listings-description">{description ?? text.description}</p>
      <div className="empty-listings-actions">
        <Link href={actionHref} className="empty-listings-primary">
          {actionHref === "/listings/new" ? (
            <Plus size={20} />
          ) : (
            <ArrowUpRight size={20} />
          )}
          {actionLabel ?? text.action}
        </Link>
        <details className="empty-listings-help">
          <summary className="empty-listings-secondary">
            <ArrowUpRight size={20} />
            {text.how}
          </summary>
          <ol>
            {text.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>
      </div>
      <p className="empty-listings-reassurance">
        <BadgeCheck size={16} />
        {text.reassurance}
      </p>
    </section>
  );
}
