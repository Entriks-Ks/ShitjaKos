export const cities = [
  "Prishtina",
  "Prizren",
  "Ferizaj",
  "Peja",
  "Gjakova",
  "Gjilan",
  "Mitrovica",
  "Vushtrri",
  "Podujeva",
  "Other",
] as const;
export const locales = ["sq", "en", "de"] as const;
export type Locale = (typeof locales)[number];
export function localeOf(value?: string): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : "sq";
}
export function translated(
  rows: { locale: string; name?: string; label?: string }[],
  locale: string,
) {
  const row =
    rows.find((r) => r.locale === locale) ??
    rows.find((r) => r.locale === "en") ??
    rows[0];
  return row?.name ?? row?.label ?? "";
}
export const copy = {
  sq: {
    search: "Kërko",
    sell: "Publiko shpallje",
    browse: "Kategoritë",
    shops: "Dyqanet",
    account: "Llogaria ime",
    favorites: "Preferuarat",
    login: "Kyçu",
    headline: "Gjej diçka të mirë.",
    subhead: "Afër teje.",
    intro:
      "Nga gjërat e përditshme te gjetjet e veçanta. Bli dhe shit në komunitetin tënd.",
    latest: "Zbulo shpalljet",
    all: "Të gjitha",
    private: "Privat",
    business: "Biznes",
    verified: "Biznes i verifikuar",
    location: "Qyteti",
    query: "Çfarë po kërkon?",
    categoryField: "Kategoritë",
    allCategories: "Të gjitha kategoritë",
    categories: "Shfleto sipas kategorisë",
    empty: "Nuk u gjet asnjë shpallje.",
    clear: "Pastro filtrat",
    results: "shpallje",
    view: "Shiko shpalljen",
    shopCtaTitle: "Biznesi yt, më afër klientëve.",
    shopCtaText: "Hap dyqanin. Jepi inventarit një shtëpi.",
    shopCtaButton: "Hap dyqanin",
    allCities: "Gjithë Kosova",
    citySearch: "Kërko qytetin",
    cityEmpty: "Nuk u gjet asnjë qytet.",
    heroTrust1: "Shpallje të kontrolluara",
    heroTrust2: "Çmime të mira",
    heroTrust3: "Nga komuniteti",
  },
  en: {
    search: "Search",
    sell: "Post a listing",
    browse: "Categories",
    shops: "Shops",
    account: "Account",
    favorites: "Favorites",
    login: "Sign In",
    headline: "Find something good.",
    subhead: "Closer to home.",
    intro:
      "From everyday essentials to unexpected finds. Buy and sell in your community.",
    latest: "Discover listings",
    all: "All sellers",
    private: "Private",
    business: "Business",
    verified: "Verified business",
    location: "City",
    query: "What are you looking for?",
    categoryField: "Categories",
    allCategories: "All categories",
    categories: "Explore by category",
    empty: "No listings found.",
    clear: "Clear filters",
    results: "listings",
    view: "View listing",
    shopCtaTitle: "Your business, closer to customers.",
    shopCtaText: "Open your shop. Give your inventory a home.",
    shopCtaButton: "Open a shop",
    allCities: "All cities",
    citySearch: "Search a city",
    cityEmpty: "No cities found.",
    heroTrust1: "Reviewed listings",
    heroTrust2: "Great prices",
    heroTrust3: "From the community",
  },
  de: {
    search: "Suchen",
    sell: "Anzeige erstellen",
    browse: "Kategorien",
    shops: "Shops",
    account: "Mein Konto",
    favorites: "Favoriten",
    login: "Anmelden",
    headline: "Entdecke etwas Gutes.",
    subhead: "Ganz in deiner Nähe.",
    intro:
      "Vom Alltäglichen bis zum besonderen Fund. Kaufe und verkaufe in deiner Nachbarschaft.",
    latest: "Anzeigen entdecken",
    all: "Alle Anbieter",
    private: "Privat",
    business: "Gewerblich",
    verified: "Geprüftes Gewerbe",
    location: "Stadt",
    query: "Was suchst du?",
    categoryField: "Kategorien",
    allCategories: "Alle Kategorien",
    categories: "Kategorien entdecken",
    empty: "Keine Anzeigen gefunden.",
    clear: "Filter zurücksetzen",
    results: "Anzeigen",
    view: "Anzeige ansehen",
    shopCtaTitle: "Dein Business, näher an den Kunden.",
    shopCtaText: "Eröffne deinen Shop. Gib deinem Inventar ein Zuhause.",
    shopCtaButton: "Shop eröffnen",
    allCities: "Alle Städte",
    citySearch: "Stadt suchen",
    cityEmpty: "Keine Städte gefunden.",
    heroTrust1: "Geprüfte Anzeigen",
    heroTrust2: "Gute Preise",
    heroTrust3: "Von der Gemeinschaft",
  },
};
export function money(cents: number | null) {
  return cents === null
    ? "Me marrëveshje / On request"
    : new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: cents % 100 ? 2 : 0,
      }).format(cents / 100);
}
export function optionLabel(
  option: { value: string; labels: Record<string, string> },
  locale: string,
) {
  return option.labels[locale] ?? option.labels.en ?? option.value;
}
