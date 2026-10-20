"use client";

import { useState } from "react";
import { AttributeSelect } from "@/components/attribute-select";
import {
  changeAttributeValue,
  searchAttributeValues,
} from "@/lib/attribute-dependencies";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import Link from "@/components/navigation-link";
import { SearchForm } from "@/components/search-form";
import { attributeFilterKey } from "@/lib/attribute-search";
import { translated, type Locale } from "@/lib/catalog";
import { searchUrl, type SearchParams } from "@/lib/search-navigation";
import type { getCategories } from "@/repositories/catalog";
import styles from "./sidebar-attribute-filters.module.css";

type Attribute = Awaited<ReturnType<typeof getCategories>>[number]["attributes"][number];

const labels = {
  sq: {
    title: "Filtro rezultatet",
    apply: "Apliko filtrat",
    clear: "Pastro",
    all: "Të gjitha",
    yes: "Po",
    no: "Jo",
    from: "Nga",
    to: "Deri",
    price: "Çmimi (€)",
    condition: "Gjendja",
    sort: "Renditja",
    newest: "Më të rejat",
    low: "Çmimi: më i ulëti",
    high: "Çmimi: më i larti",
    conditions: ["E re", "Si e re", "E përdorur", "Me defekt", "Për pjesë"],
  },
  en: {
    title: "Filter results",
    apply: "Apply filters",
    clear: "Clear",
    all: "Any",
    yes: "Yes",
    no: "No",
    from: "From",
    to: "To",
    price: "Price (€)",
    condition: "Condition",
    sort: "Sort",
    newest: "Newest first",
    low: "Price: low to high",
    high: "Price: high to low",
    conditions: ["New", "Like new", "Used", "Defective", "For parts"],
  },
  de: {
    title: "Ergebnisse filtern",
    apply: "Filter anwenden",
    clear: "Zurücksetzen",
    all: "Alle",
    yes: "Ja",
    no: "Nein",
    from: "Von",
    to: "Bis",
    price: "Preis (€)",
    condition: "Zustand",
    sort: "Sortierung",
    newest: "Neueste zuerst",
    low: "Preis: aufsteigend",
    high: "Preis: absteigend",
    conditions: ["Neu", "Wie neu", "Gebraucht", "Defekt", "Als Ersatzteile"],
  },
};

export function SidebarAttributeFilters({
  attributes,
  categoryName,
  params,
  locale,
}: {
  attributes: Attribute[];
  categoryName: string;
  params: SearchParams;
  locale: Locale;
}) {
  const t = labels[locale];
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    searchAttributeValues(attributes, params),
  );
  // Keep query, location and seller; replace sidebar filters and reset pagination.
  const preserved = Object.fromEntries(
    Object.entries(params).filter(
      ([key, value]) =>
        value &&
        !attributeFilterKey(key) &&
        !["page", "attribute", "value", "min", "max", "condition", "sort"].includes(key),
    ),
  );
  const active =
    Object.keys(params).some((key) => attributeFilterKey(key) && params[key]) ||
    Boolean(params.attribute && params.value) ||
    Boolean(params.min || params.max || params.condition || params.sort);

  return (
    <details className={styles.panel} open>
      <summary className={styles.heading}>
        <SlidersHorizontal size={16} aria-hidden="true" />
        <span>
          {t.title}
          <small>{categoryName}</small>
        </span>
        <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      </summary>
      <SearchForm className={styles.form}>
        {Object.entries(preserved).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        {!preserved.lang && <input type="hidden" name="lang" value={locale} />}
        <fieldset className={styles.field}>
          <legend>{t.price}</legend>
          <div className={styles.range}>
            {(["min", "max"] as const).map((key) => (
              <input
                key={key}
                name={key}
                type="number"
                min="0"
                max="20000000"
                step="0.01"
                aria-label={`${t.price}: ${key === "min" ? t.from : t.to}`}
                placeholder={key === "min" ? t.from : t.to}
                defaultValue={params[key] ?? ""}
              />
            ))}
          </div>
        </fieldset>
        {attributes.map((attribute) => {
          if (attribute.dependsOnId && !values[attribute.dependsOnId]) return null;
          const label = translated(attribute.translations, locale);
          if (attribute.type === "NUMBER") {
            return (
              <fieldset className={styles.field} key={attribute.id}>
                <legend>
                  {label}
                  {attribute.unit ? ` (${attribute.unit})` : ""}
                </legend>
                <div className={styles.range}>
                  {(["from", "to"] as const).map((kind) => (
                    <input
                      key={kind}
                      aria-label={`${label}: ${kind === "from" ? t.from : t.to}`}
                      name={`${kind}_${attribute.id}`}
                      type="number"
                      step="any"
                      placeholder={kind === "from" ? t.from : t.to}
                      min={attribute.min ?? undefined}
                      max={attribute.max ?? undefined}
                      defaultValue={params[`${kind}_${attribute.id}`] ?? ""}
                    />
                  ))}
                </div>
              </fieldset>
            );
          }
          return (
            <label className={styles.field} key={attribute.id}>
              <span>{label}</span>
              {attribute.type === "SELECT" ? (
                <AttributeSelect
                  field={attribute}
                  fields={attributes}
                  values={values}
                  locale={locale}
                  name={`field_${attribute.id}`}
                  emptyLabel={t.all}
                  onChange={(id, value) =>
                    setValues((current) =>
                      changeAttributeValue(attributes, current, id, value),
                    )
                  }
                />
              ) : (
                <select
                  name={`field_${attribute.id}`}
                  defaultValue={String(values[attribute.id] ?? "")}
                >
                  <option value="">{t.all}</option>
                  <option value="true">{t.yes}</option>
                  <option value="false">{t.no}</option>
                </select>
              )}
            </label>
          );
        })}
        <label className={styles.field}>
          <span>{t.condition}</span>
          <select name="condition" defaultValue={params.condition ?? ""}>
            <option value="">{t.all}</option>
            {["NEW", "LIKE_NEW", "USED", "DEFECTIVE", "FOR_PARTS"].map((value, index) => (
              <option key={value} value={value}>
                {t.conditions[index]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>{t.sort}</span>
          <select name="sort" defaultValue={params.sort ?? "newest"}>
            <option value="newest">{t.newest}</option>
            <option value="price-asc">{t.low}</option>
            <option value="price-desc">{t.high}</option>
          </select>
        </label>
        <div className={styles.actions}>
          <button type="submit" className={styles.apply}>
            {t.apply}
          </button>
          {active && (
            <Link
              href={searchUrl({ ...preserved, lang: locale })}
              className={styles.clear}
            >
              {t.clear}
            </Link>
          )}
        </div>
      </SearchForm>
    </details>
  );
}
