import { Search } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { SearchCategoryMenu } from "@/components/search-category-menu";
import { cities, copy, Locale, translated } from "@/lib/catalog";
import type { getCategories } from "@/repositories/catalog";

type Category = Awaited<ReturnType<typeof getCategories>>[number];

export function ListingSearchBar({
  locale,
  categories,
  params = {},
  className = "searchbar",
}: {
  locale: Locale;
  categories: Category[];
  params?: {
    q?: string;
    category?: string;
    city?: string;
  };
  className?: string;
}) {
  const t = copy[locale];
  return (
    <SearchForm key={JSON.stringify(params)} className={className}>
      <input type="hidden" name="lang" value={locale} />
      <div className="hidden sm:flex items-center pl-3">
        <Search size={19} />
      </div>
      <input
        name="q"
        aria-label={t.query}
        placeholder={t.query}
        defaultValue={params.q}
      />
      <SearchCategoryMenu
        label={t.categoryField}
        allLabel={t.allCategories}
        defaultValue={params.category ?? ""}
        categories={categories.map((category) => ({
          id: category.id,
          parentId: category.parentId,
          name: translated(category.translations, locale),
          icon: category.icon,
        }))}
      />
      <select name="city" aria-label={t.location} defaultValue={params.city ?? ""}>
        <option value="">Gjithë Kosova · All cities</option>
        {cities.map((city) => (
          <option key={city}>{city}</option>
        ))}
      </select>
      <button className="btn btn-primary" type="submit">
        <Search size={17} />
        {t.search}
      </button>
    </SearchForm>
  );
}
