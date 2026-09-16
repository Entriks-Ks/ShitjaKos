import Link from "@/components/navigation-link";
import { SearchForm } from "@/components/search-form";
import { cities, copy, Locale, optionLabel, translated } from "@/lib/catalog";
import { SearchParams } from "@/lib/search-navigation";
import type { getCategories } from "@/repositories/catalog";

export function SearchFilters({
  params: p,
  locale,
  selected,
}: {
  params: SearchParams;
  locale: Locale;
  selected?: Awaited<ReturnType<typeof getCategories>>[number];
}) {
  const t = copy[locale];
  const attributes =
    selected?.attributes.filter(
      (attribute) => attribute.type === "SELECT" && attribute.filterable,
    ) ?? [];
  return (
    <SearchForm key={JSON.stringify(p)} className="panel mb-6">
      <input type="hidden" name="lang" value={locale} />
      <div className="filter-grid">
        <label className="field">
          {t.search}
          <input name="q" placeholder={t.query} defaultValue={p.q} />
        </label>
        {p.category && <input type="hidden" name="category" value={p.category} />}
        <label className="field">
          {t.location}
          <select name="city" defaultValue={p.city ?? ""}>
            <option value="">Gjithë Kosova</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Shitësi / Seller
          <select name="seller" defaultValue={p.seller ?? ""}>
            <option value="">{t.all}</option>
            <option value="private">{t.private}</option>
            <option value="business">{t.business}</option>
            <option value="verified">{t.verified}</option>
          </select>
        </label>
        <label className="field">
          Min €
          <input name="min" type="number" min="0" step="0.01" defaultValue={p.min} />
        </label>
        <label className="field">
          Max €
          <input name="max" type="number" min="0" step="0.01" defaultValue={p.max} />
        </label>
        <label className="field">
          Lloji / Intent
          <select name="intent" defaultValue={p.intent ?? ""}>
            <option value="">All</option>
            <option value="FOR_SALE">For sale</option>
            <option value="WANTED">Wanted</option>
          </select>
        </label>
        <label className="field">
          Rendit / Sort
          <select name="sort" defaultValue={p.sort ?? "newest"}>
            <option value="newest">Newest first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
        <label className="field">
          Gjendja / Condition
          <select name="condition" defaultValue={p.condition ?? ""}>
            <option value="">All conditions</option>
            {["NEW", "LIKE_NEW", "USED", "DEFECTIVE", "FOR_PARTS"].map((c) => (
              <option key={c} value={c}>
                {c.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        {attributes[0] && (
          <label className="field">
            {translated(attributes[0].translations, locale)}
            <input type="hidden" name="attribute" value={attributes[0].id} />
            <select name="value" defaultValue={p.value ?? ""}>
              <option value="">All</option>
              {(
                attributes[0].options as {
                  value: string;
                  labels: Record<string, string>;
                }[]
              ).map((o) => (
                <option key={o.value} value={o.value}>
                  {optionLabel(o, locale)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex gap-4 mt-4 items-center">
        <button className="btn btn-primary">{t.search}</button>
        <Link className="text-sm text-stone-500" href={`/search?lang=${locale}`}>
          {t.clear}
        </Link>
      </div>
    </SearchForm>
  );
}
