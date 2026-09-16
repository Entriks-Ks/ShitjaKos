"use client";

import { startTransition, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createFieldsAction } from "@/app/(admin)/admin/catalog/actions";

type Names = { sq: string; en: string; de: string };
type FieldType = "TEXT" | "NUMBER" | "SELECT" | "BOOLEAN";
type DraftField = {
  id: number;
  names: Names;
  type: FieldType;
  required: boolean;
  filterable: boolean;
  unit: string;
  min: string;
  max: string;
  options: Names[];
};

const emptyNames = (): Names => ({ sq: "", en: "", de: "" });
const emptyField = (id: number): DraftField => ({
  id,
  names: emptyNames(),
  type: "TEXT",
  required: false,
  filterable: false,
  unit: "",
  min: "",
  max: "",
  options: [emptyNames(), emptyNames()],
});

export function FieldBatchCreateForm({
  subcategories,
}: {
  subcategories: {
    id: string;
    name: string;
    group: string;
    hasListings: boolean;
    hasChoiceFilter: boolean;
  }[];
}) {
  const [categoryId, setCategoryId] = useState("");
  const [fields, setFields] = useState<DraftField[]>([emptyField(0)]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = subcategories.find((category) => category.id === categoryId);

  function updateField(id: number, change: Partial<DraftField>) {
    setFields((current) =>
      current.map((field) => (field.id === id ? { ...field, ...change } : field)),
    );
  }

  return (
    <form
      className="panel space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        startTransition(async () => {
          try {
            const result = await createFieldsAction({
              categoryId,
              fields: fields.map(({ id: _id, ...field }) => {
                void _id;
                return {
                  ...field,
                  required: selected?.hasListings ? false : field.required,
                  filterable: field.type === "SELECT" && field.filterable,
                  unit: field.type === "NUMBER" ? field.unit : "",
                  min: field.type === "NUMBER" && field.min ? Number(field.min) : null,
                  max: field.type === "NUMBER" && field.max ? Number(field.max) : null,
                  options: field.type === "SELECT" ? field.options : [],
                };
              }),
            });
            if (result.error) {
              setError(result.error);
            } else {
              const count = result.ids?.length ?? fields.length;
              setFields([emptyField(0)]);
              setMessage(`${count} listing ${count === 1 ? "field" : "fields"} added.`);
            }
          } catch {
            setError("Could not add the fields. Please try again.");
          } finally {
            setBusy(false);
          }
        });
      }}
    >
      <div>
        <h2 className="mb-1">Add listing fields</h2>
        <p className="muted text-sm">
          Choose one subcategory, prepare up to 20 fields, then save them together.
        </p>
      </div>
      <label className="field">
        Subcategory
        <select
          required
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setFields((current) =>
              current.map((field) => ({ ...field, required: false, filterable: false })),
            );
          }}
        >
          <option value="">Choose a subcategory</option>
          {subcategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.group} / {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-4">
        {fields.map((field, index) => {
          const anotherFilter = fields.some(
            (candidate) => candidate.id !== field.id && candidate.filterable,
          );
          return (
            <fieldset
              className="rounded-xl border border-stone-200 p-4 space-y-4"
              key={field.id}
            >
              <div className="flex items-center justify-between gap-3">
                <legend className="font-semibold">Field {index + 1}</legend>
                {fields.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    aria-label={`Remove field ${index + 1}`}
                    onClick={() =>
                      setFields((current) =>
                        current.filter((item) => item.id !== field.id),
                      )
                    }
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                )}
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {(["sq", "en", "de"] as const).map((locale) => (
                  <label className="field" key={locale}>
                    {{ sq: "Albanian", en: "English", de: "German" }[locale]} label
                    <input
                      required
                      minLength={2}
                      maxLength={80}
                      value={field.names[locale]}
                      onChange={(event) =>
                        updateField(field.id, {
                          names: { ...field.names, [locale]: event.target.value },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <label className="field">
                Answer type
                <select
                  value={field.type}
                  onChange={(event) =>
                    updateField(field.id, {
                      type: event.target.value as FieldType,
                      filterable: false,
                    })
                  }
                >
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="SELECT">Choose from options</option>
                  <option value="BOOLEAN">Yes or no</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.required}
                  disabled={selected?.hasListings}
                  onChange={(event) =>
                    updateField(field.id, { required: event.target.checked })
                  }
                />
                Sellers must answer this field
              </label>
              {selected?.hasListings && (
                <p className="muted text-sm">
                  Existing listings make newly added fields optional.
                </p>
              )}
              {field.type === "NUMBER" && (
                <div className="grid sm:grid-cols-3 gap-3">
                  {(["unit", "min", "max"] as const).map((property) => (
                    <label className="field" key={property}>
                      {
                        { unit: "Unit, if needed", min: "Minimum", max: "Maximum" }[
                          property
                        ]
                      }
                      <input
                        type={property === "unit" ? "text" : "number"}
                        step={property === "unit" ? undefined : "any"}
                        maxLength={property === "unit" ? 20 : undefined}
                        value={field[property]}
                        onChange={(event) =>
                          updateField(field.id, { [property]: event.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
              {field.type === "SELECT" && (
                <div className="space-y-3">
                  <p className="font-medium text-sm">Choices</p>
                  {field.options.map((option, optionIndex) => (
                    <div className="rounded-lg bg-stone-50 p-3" key={optionIndex}>
                      <div className="flex justify-between gap-3 mb-2 text-sm">
                        <strong>Choice {optionIndex + 1}</strong>
                        {field.options.length > 2 && (
                          <button
                            type="button"
                            className="underline text-stone-500"
                            onClick={() =>
                              updateField(field.id, {
                                options: field.options.filter(
                                  (_, current) => current !== optionIndex,
                                ),
                              })
                            }
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2">
                        {(["sq", "en", "de"] as const).map((locale) => (
                          <label className="field" key={locale}>
                            {locale.toUpperCase()}
                            <input
                              required
                              minLength={2}
                              maxLength={80}
                              value={option[locale]}
                              onChange={(event) => {
                                const options = [...field.options];
                                options[optionIndex] = {
                                  ...option,
                                  [locale]: event.target.value,
                                };
                                updateField(field.id, { options });
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  {field.options.length < 20 && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        updateField(field.id, {
                          options: [...field.options, emptyNames()],
                        })
                      }
                    >
                      Add choice
                    </button>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.filterable}
                      disabled={selected?.hasChoiceFilter || anotherFilter}
                      onChange={(event) =>
                        updateField(field.id, { filterable: event.target.checked })
                      }
                    />
                    Let buyers filter results by this field
                  </label>
                  {(selected?.hasChoiceFilter || anotherFilter) && (
                    <p className="muted text-sm">
                      Only one choice field per subcategory can be a search filter.
                    </p>
                  )}
                </div>
              )}
            </fieldset>
          );
        })}
      </div>

      {fields.length < 20 && (
        <button
          type="button"
          className="btn btn-outline"
          onClick={() =>
            setFields((current) => [
              ...current,
              emptyField(Math.max(...current.map((field) => field.id)) + 1),
            ])
          }
        >
          <Plus size={16} /> Add another field
        </button>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <button className="btn btn-primary" disabled={busy || !categoryId}>
        {busy
          ? "Saving fields…"
          : `Save ${fields.length} ${fields.length === 1 ? "field" : "fields"}`}
      </button>
    </form>
  );
}
