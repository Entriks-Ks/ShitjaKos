"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "@/components/navigation-link";
import { SlidersHorizontal, X } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import {
  copy,
  countries,
  countryName,
  Locale,
  optionLabel,
  translated,
} from "@/lib/catalog";
import { SearchParams } from "@/lib/search-navigation";
import type { getCategories } from "@/repositories/catalog";

const advancedKeys = [
  "seller",
  "min",
  "max",
  "intent",
  "sort",
  "condition",
  "attribute",
  "value",
] as const;

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
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const attributes =
    selected?.attributes.filter(
      (attribute) => attribute.type === "SELECT" && attribute.filterable,
    ) ?? [];

  const activeCount = advancedKeys.filter((key) => {
    if (key === "sort") return Boolean(p.sort && p.sort !== "newest");
    return Boolean(p[key]);
  }).length;

  const labels = {
    sq: {
      filters: "Filtrat",
      advanced: "Filtra të avancuar",
      apply: "Apliko",
      seller: "Shitësi",
      intent: "Lloji",
      sort: "Renditja",
      condition: "Gjendja",
    },
    en: {
      filters: "Filters",
      advanced: "Advanced filters",
      apply: "Apply",
      seller: "Seller",
      intent: "Intent",
      sort: "Sort",
      condition: "Condition",
    },
    de: {
      filters: "Filter",
      advanced: "Erweiterte Filter",
      apply: "Anwenden",
      seller: "Anbieter",
      intent: "Art",
      sort: "Sortierung",
      condition: "Zustand",
    },
  }[locale];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <button
        type="button"
        className={`search-filter-trigger${activeCount ? " has-active" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={titleId}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span>{labels.filters}</span>
        {activeCount > 0 && <span className="search-filter-count">{activeCount}</span>}
      </button>

      <dialog ref={dialogRef} className="filter-dialog" aria-labelledby={titleId}>
        <div className="filter-dialog-card">
          <header className="filter-dialog-header">
            <div>
              <h2 id={titleId}>{labels.advanced}</h2>
              <p className="muted text-sm">Refine results beyond the search bar.</p>
            </div>
            <button
              type="button"
              className="filter-dialog-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>

          <SearchForm
            key={JSON.stringify(p)}
            className="filter-dialog-form"
            onSubmitted={() => setOpen(false)}
          >
            <input type="hidden" name="lang" value={locale} />
            {p.q && <input type="hidden" name="q" value={p.q} />}
            {p.category && <input type="hidden" name="category" value={p.category} />}
            {p.country && <input type="hidden" name="country" value={p.country} />}

            <div className="filter-dialog-grid">
              <label className="field">
                {labels.seller}
                <select name="seller" defaultValue={p.seller ?? ""}>
                  <option value="">{t.all}</option>
                  <option value="private">{t.private}</option>
                  <option value="business">{t.business}</option>
                  <option value="verified">{t.verified}</option>
                </select>
              </label>
              <label className="field">
                {t.location}
                <select name="city" defaultValue={p.city ?? ""}>
                  <option value="">{t.allCities}</option>
                  {countries.map((country) => (
                    <optgroup key={country.id} label={countryName(country, locale)}>
                      {country.cities.map((city) => (
                        <option key={city}>{city}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="field">
                Min €
                <input
                  name="min"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={p.min}
                />
              </label>
              <label className="field">
                Max €
                <input
                  name="max"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={p.max}
                />
              </label>
              <label className="field">
                {labels.intent}
                <select name="intent" defaultValue={p.intent ?? ""}>
                  <option value="">All</option>
                  <option value="FOR_SALE">For sale</option>
                  <option value="WANTED">Wanted</option>
                </select>
              </label>
              <label className="field">
                {labels.sort}
                <select name="sort" defaultValue={p.sort ?? "newest"}>
                  <option value="newest">Newest first</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </label>
              <label className="field">
                {labels.condition}
                <select name="condition" defaultValue={p.condition ?? ""}>
                  <option value="">All conditions</option>
                  {["NEW", "LIKE_NEW", "USED", "DEFECTIVE", "FOR_PARTS"].map(
                    (condition) => (
                      <option key={condition} value={condition}>
                        {condition.replaceAll("_", " ")}
                      </option>
                    ),
                  )}
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
                    ).map((option) => (
                      <option key={option.value} value={option.value}>
                        {optionLabel(option, locale)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="filter-dialog-actions">
              <button className="btn btn-primary" type="submit">
                {labels.apply}
              </button>
              <Link
                className="text-sm text-stone-500"
                href={`/search?lang=${locale}`}
                onClick={() => setOpen(false)}
              >
                {t.clear}
              </Link>
            </div>
          </SearchForm>
        </div>
      </dialog>
    </>
  );
}
