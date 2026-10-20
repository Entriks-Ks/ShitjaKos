"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { updateFieldAction } from "@/app/(admin)/admin/catalog/actions";
import { MAX_SELECT_CHOICES } from "@/lib/catalog-limits";

type Names = { sq: string; en: string; de: string };
type FieldType = "TEXT" | "NUMBER" | "SELECT" | "BOOLEAN";
export type EditableField = {
  id: string;
  names: Names;
  type: FieldType;
  required: boolean;
  filterable: boolean;
  unit: string;
  min: number | null;
  max: number | null;
  dependsOnId?: string | null;
  parentFields?: {
    id: string;
    name: string;
    options: { value: string; label: string }[];
  }[];
  options: { value: string | null; names: Names; parentValues?: string[] }[];
  hasValues: boolean;
  hasListings: boolean;
};

export function FieldEditForm({
  field,
  dialog,
}: {
  field: EditableField;
  dialog: RefObject<HTMLDialogElement | null>;
}) {
  const router = useRouter();
  const [names, setNames] = useState(field.names);
  const [type, setType] = useState(field.type);
  const [required, setRequired] = useState(field.required);
  const [filterable, setFilterable] = useState(field.filterable);
  const [unit, setUnit] = useState(field.unit);
  const [min, setMin] = useState(field.min?.toString() ?? "");
  const [max, setMax] = useState(field.max?.toString() ?? "");
  const [options, setOptions] = useState(field.options);
  const [dependsOnId, setDependsOnId] = useState(field.dependsOnId ?? "");
  const [choiceFilter, setChoiceFilter] = useState(
    field.parentFields?.find((item) => item.id === field.dependsOnId)?.options[0]
      ?.value ?? "",
  );
  const [query, setQuery] = useState("");
  const parent = field.parentFields?.find((item) => item.id === dependsOnId);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <dialog ref={dialog} className="catalog-edit-dialog" aria-label="Edit listing field">
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          startTransition(async () => {
            try {
              const result = await updateFieldAction(field.id, {
                names,
                type,
                required,
                filterable: type === "SELECT" && filterable,
                unit: type === "NUMBER" ? unit : "",
                min: type === "NUMBER" && min !== "" ? Number(min) : null,
                max: type === "NUMBER" && max !== "" ? Number(max) : null,
                options: type === "SELECT" ? options : [],
                dependsOnId: type === "SELECT" ? dependsOnId || null : null,
              });
              if (result.error) setError(result.error);
              else {
                dialog.current?.close();
                router.refresh();
              }
            } catch {
              setError("Could not update this field. Please try again.");
            } finally {
              setBusy(false);
            }
          });
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2>Edit listing field</h2>
            <p className="muted mt-1 text-sm">
              Update labels, choices and how sellers answer.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
          >
            <X size={17} />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["sq", "en", "de"] as const).map((locale) => (
            <label className="field" key={locale}>
              {{ sq: "Albanian", en: "English", de: "German" }[locale]} label
              <input
                required
                minLength={2}
                maxLength={80}
                value={names[locale]}
                onChange={(event) => setNames({ ...names, [locale]: event.target.value })}
              />
            </label>
          ))}
        </div>
        <label className="field">
          Answer type
          <select
            value={type}
            disabled={field.hasValues}
            onChange={(event) => {
              setType(event.target.value as FieldType);
              setFilterable(false);
            }}
          >
            <option value="TEXT">Text</option>
            <option value="NUMBER">Number</option>
            <option value="SELECT">Choose from options</option>
            <option value="BOOLEAN">Yes or no</option>
          </select>
        </label>
        {field.hasValues && (
          <p className="muted text-sm">
            Answer type is locked because listings have saved answers.
          </p>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={required}
            disabled={field.hasListings && !field.required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          Sellers must answer this field
        </label>
        {type === "NUMBER" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="field">
              Unit
              <input
                maxLength={20}
                disabled={field.hasValues}
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              />
            </label>
            <label className="field">
              Minimum
              <input
                type="number"
                step="any"
                value={min}
                onChange={(event) => setMin(event.target.value)}
              />
            </label>
            <label className="field">
              Maximum
              <input
                type="number"
                step="any"
                value={max}
                onChange={(event) => setMax(event.target.value)}
              />
            </label>
          </div>
        )}
        {type === "SELECT" && (
          <div className="space-y-3">
            <label className="field">
              Depends on
              <select
                value={dependsOnId}
                disabled={field.hasValues}
                onChange={(event) => {
                  setDependsOnId(event.target.value);
                  setChoiceFilter("");
                  setOptions(options.map((option) => ({ ...option, parentValues: [] })));
                }}
              >
                <option value="">Independent field</option>
                {field.parentFields?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {parent && (
              <label className="field">
                Show choices for {parent.name}
                <select
                  value={choiceFilter}
                  onChange={(event) => setChoiceFilter(event.target.value)}
                >
                  <option value="">All choices</option>
                  {parent.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              Find a choice
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <p className="font-medium text-sm">
              Choices ({options.length}/{MAX_SELECT_CHOICES})
            </p>
            {options.map((option, index) => {
              if (
                (choiceFilter && !option.parentValues?.includes(choiceFilter)) ||
                (query &&
                  !Object.values(option.names).some((name) =>
                    name.toLowerCase().includes(query.toLowerCase()),
                  ))
              )
                return null;
              return (
                <div
                  className="rounded-xl border border-stone-200 p-3"
                  key={option.value ?? `new-${index}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <strong className="text-sm">Choice {index + 1}</strong>
                    {options.length > 2 && !field.hasValues && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setOptions(options.filter((_, i) => i !== index))}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                  {parent && (
                    <label className="field mb-3">
                      Available for {parent.name}
                      <select
                        multiple
                        required
                        disabled={field.hasValues && option.value !== null}
                        value={option.parentValues ?? []}
                        onChange={(event) => {
                          const parentValues = Array.from(
                            event.target.selectedOptions,
                            (item) => item.value,
                          );
                          setOptions(
                            options.map((current, i) =>
                              i === index ? { ...current, parentValues } : current,
                            ),
                          );
                        }}
                      >
                        {parent.options.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(["sq", "en", "de"] as const).map((locale) => (
                      <label className="field" key={locale}>
                        {locale.toUpperCase()}
                        <input
                          required
                          minLength={1}
                          maxLength={80}
                          value={option.names[locale]}
                          onChange={(event) =>
                            setOptions(
                              options.map((current, i) =>
                                i === index
                                  ? {
                                      ...current,
                                      names: {
                                        ...current.names,
                                        [locale]: event.target.value,
                                      },
                                    }
                                  : current,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            {options.length < MAX_SELECT_CHOICES && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setQuery("");
                  setOptions([
                    ...options,
                    {
                      value: null,
                      names: { sq: "", en: "", de: "" },
                      parentValues: choiceFilter ? [choiceFilter] : [],
                    },
                  ]);
                }}
              >
                <Plus size={15} /> Add choice
              </button>
            )}
            <p className="muted text-sm">
              This choice field appears automatically in advanced search.
            </p>
          </div>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
