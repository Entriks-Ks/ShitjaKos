import { Search } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { SearchCategoryMenu } from "@/components/search-category-menu";
import { SearchCityMenu } from "@/components/search-city-menu";
import { copy, Locale, translated } from "@/lib/catalog";
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
    country?: string;
  };
  className?: string;
}) {
  const t = copy[locale];
  return (
    <SearchForm key={JSON.stringify(params)} className={className}>
      <input type="hidden" name="lang" value={locale} />
      <label className="searchbar-field searchbar-query">
        <span className="searchbar-field-label">{t.search}</span>
        <span className="searchbar-field-control">
          <Search size={17} aria-hidden="true" />
          <input
            name="q"
            aria-label={t.query}
            placeholder={t.query}
            defaultValue={params.q}
          />
        </span>
      </label>
      <div className="searchbar-field searchbar-category">
        <span className="searchbar-field-label">{t.categoryField}</span>
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
      </div>
      <div className="searchbar-field searchbar-city">
        <span className="searchbar-field-label">{t.location}</span>
        <SearchCityMenu
          locale={locale}
          label={t.location}
          allInCountry={t.allInCountry}
          changeCountryLabel={t.changeCountry}
          searchLabel={t.citySearch}
          emptyLabel={t.cityEmpty}
          defaultCity={params.city ?? ""}
          defaultCountry={params.country ?? ""}
        />
      </div>
      <button className="searchbar-submit" type="submit">
        <Search size={17} />
        <span>{t.search}</span>
      </button>
    </SearchForm>
  );
}
