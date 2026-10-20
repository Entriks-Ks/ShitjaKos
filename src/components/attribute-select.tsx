"use client";

import { availableOptions, type DependentAttribute } from "@/lib/attribute-dependencies";
import { optionLabel, translated, type Locale } from "@/lib/catalog";

type Field = DependentAttribute & {
  translations: { locale: string; label: string }[];
};

export function AttributeSelect({
  field,
  fields,
  values,
  onChange,
  locale,
  name,
  required = false,
  emptyLabel,
}: {
  field: Field;
  fields: Field[];
  values: Record<string, unknown>;
  onChange: (id: string, value: string) => void;
  locale: Locale;
  name?: string;
  required?: boolean;
  emptyLabel: string;
}) {
  const parent = fields.find((item) => item.id === field.dependsOnId);
  const waiting = Boolean(field.dependsOnId && !values[field.dependsOnId]);
  const options = availableOptions(field, values);
  const value = String(values[field.id] ?? "");
  const prompt = {
    sq: `Zgjidh ${parent ? translated(parent.translations, locale) : "markën"} së pari`,
    en: `Choose ${parent ? translated(parent.translations, locale) : "brand"} first`,
    de: `Zuerst ${parent ? translated(parent.translations, locale) : "Marke"} wählen`,
  }[locale];
  return (
    <select
      name={name}
      required={required}
      disabled={waiting}
      value={options.some((option) => option.value === value) ? value : ""}
      onChange={(event) => onChange(field.id, event.target.value)}
    >
      <option value="">{waiting ? prompt : emptyLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {optionLabel(option, locale)}
        </option>
      ))}
    </select>
  );
}
