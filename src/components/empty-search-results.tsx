import Image from "next/image";
import Link from "@/components/navigation-link";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import type { Locale } from "@/lib/catalog";

const messages = {
  sq: {
    title: "Nuk u gjet asnjë shpallje",
    description:
      "Provo fjalë të tjera ose ndrysho kategorinë, qytetin apo filtrat për të gjetur atë që kërkon.",
    clear: "Pastro filtrat",
    home: "Kthehu në ballinë",
  },
  en: {
    title: "No matching listings",
    description:
      "Try different keywords or change the category, city or filters to find what you’re looking for.",
    clear: "Clear filters",
    home: "Back to marketplace",
  },
  de: {
    title: "Keine passenden Anzeigen",
    description:
      "Versuche andere Suchbegriffe oder ändere die Kategorie, den Ort oder die Filter, um das Gesuchte zu finden.",
    clear: "Filter zurücksetzen",
    home: "Zur Startseite",
  },
};

export function EmptySearchResults({ locale }: { locale: Locale }) {
  const text = messages[locale];
  return (
    <section className="empty-listings empty-search-results">
      <Image
        className="empty-listings-art"
        src="/illustrations/empty-search.svg"
        width={500}
        height={276}
        alt=""
        unoptimized
      />
      <h2>{text.title}</h2>
      <p className="empty-listings-description">{text.description}</p>
      <div className="empty-listings-actions">
        <Link href={`/search?lang=${locale}`} className="empty-listings-primary">
          <RotateCcw size={18} aria-hidden="true" />
          {text.clear}
        </Link>
        <Link href={`/?lang=${locale}`} className="empty-listings-secondary">
          <ArrowUpRight size={20} aria-hidden="true" />
          {text.home}
        </Link>
      </div>
    </section>
  );
}
