"use client";
import { useId, useState } from "react";
export type BusinessCategoryOption = { id: string; name: string };
export function BusinessCategoryFields({
  options,
  initialIds = [],
}: {
  options: BusinessCategoryOption[];
  initialIds?: string[];
}) {
  const id = useId();
  const activeIds = new Set(options.map((o) => o.id));
  const [primary, setPrimary] = useState(
    activeIds.has(initialIds[0]) ? initialIds[0] : "",
  );
  const [additional, setAdditional] = useState(
    initialIds.slice(1).filter((id) => activeIds.has(id)),
  );
  return (
    <fieldset className="space-y-4 rounded-2xl border border-stone-200 p-5">
      <legend className="px-2 font-semibold">Business categories</legend>
      <p className="text-sm text-stone-500">
        Choose what your business sells. Product details belong to individual listings.
      </p>
      {initialIds.some((id) => !activeIds.has(id)) && (
        <p className="text-sm text-amber-800">
          A previous category is unavailable. Review your selections.
        </p>
      )}
      {!options.length && (
        <p role="status">
          No business categories are available yet. Please try again after the catalogue
          is updated.
        </p>
      )}
      <label className="field" htmlFor={id}>
        Primary category
        <select
          id={id}
          name="categoryIds"
          required
          value={primary}
          onChange={(e) => {
            setPrimary(e.target.value);
            setAdditional((current) => current.filter((id) => id !== e.target.value));
          }}
        >
          <option value="" disabled>
            Choose a primary category
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm font-medium">
        Additional categories{" "}
        <span className="text-stone-500">({additional.length}/3)</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options
          .filter((o) => o.id !== primary)
          .map((o) => {
            const checked = additional.includes(o.id);
            return (
              <label
                key={o.id}
                className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${checked ? "border-emerald-700 bg-emerald-50" : "border-stone-200"}`}
              >
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={o.id}
                  checked={checked}
                  disabled={!primary || (!checked && additional.length >= 3)}
                  onChange={() =>
                    setAdditional((current) =>
                      current.includes(o.id)
                        ? current.filter((id) => id !== o.id)
                        : current.length < 3
                          ? [...current, o.id]
                          : current,
                    )
                  }
                />
                {o.name}
              </label>
            );
          })}
      </div>
    </fieldset>
  );
}
