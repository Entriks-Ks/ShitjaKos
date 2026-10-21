"use client";

import { useId } from "react";
import { availableOptions, type DependentAttribute } from "@/lib/attribute-dependencies";
import { optionLabel, translated, type Locale } from "@/lib/catalog";
import styles from "./attribute-search-choice.module.css";

type Field = DependentAttribute & {
  filterDisplay?: string;
  translations: { locale: string; label: string }[];
};

export function AttributeSearchChoice({
  field,
  values,
  onChange,
  locale,
  emptyLabel,
}: {
  field: Field;
  fields?: Field[];
  name?: string;
  values: Record<string, unknown>;
  onChange: (id: string, value: string | string[]) => void;
  locale: Locale;
  emptyLabel: string;
}) {
  const group = useId();
  const options = availableOptions(field, values);
  const raw = values[field.id];
  const selected = (
    Array.isArray(raw) ? raw : typeof raw === "string" && raw ? [raw] : []
  ).filter(
    (value): value is string =>
      typeof value === "string" && options.some((option) => option.value === value),
  );
  const multiple = field.filterDisplay === "CHECKBOX";
  const value = selected[0] ?? "";
  const label = translated(field.translations, locale);
  if (!multiple && field.filterDisplay !== "RADIO")
    return (
      <select
        aria-label={label}
        name={`field_${field.id}`}
        value={value}
        onChange={(event) => onChange(field.id, event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {optionLabel(option, locale)}
          </option>
        ))}
      </select>
    );
  return (
    <div className={styles.choices} role="group" aria-label={label}>
      <input
        type="hidden"
        name={`${multiple ? "choices" : "field"}_${field.id}`}
        value={
          multiple ? (selected.length ? JSON.stringify([...selected].sort()) : "") : value
        }
      />
      {!multiple && (
        <label className={styles.choice}>
          <input
            type="radio"
            name={`ui_${group}`}
            checked={!value}
            onChange={() => onChange(field.id, "")}
          />
          <span>{emptyLabel}</span>
        </label>
      )}
      {options.map((option) => (
        <label key={option.value} className={styles.choice}>
          <input
            type={multiple ? "checkbox" : "radio"}
            name={multiple ? undefined : `ui_${group}`}
            checked={multiple ? selected.includes(option.value) : value === option.value}
            disabled={
              multiple && selected.length >= 50 && !selected.includes(option.value)
            }
            onChange={(event) =>
              onChange(
                field.id,
                multiple
                  ? event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value)
                  : option.value,
              )
            }
          />
          <span>{optionLabel(option, locale)}</span>
        </label>
      ))}
    </div>
  );
}
