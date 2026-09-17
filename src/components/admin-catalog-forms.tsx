"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCategoryAction,
  createFieldAction,
} from "@/app/(admin)/admin/catalog/actions";

type Names = { sq: string; en: string; de: string };
type FieldType = "TEXT" | "NUMBER" | "SELECT" | "BOOLEAN";
type CatalogGroup = { id: string; name: string };

function namesFrom(form: FormData, prefix: string): Names {
  return {
    sq: String(form.get(`${prefix}Sq`) ?? ""),
    en: String(form.get(`${prefix}En`) ?? ""),
    de: String(form.get(`${prefix}De`) ?? ""),
  };
}

function NameFields({ prefix, title }: { prefix: string; title: string }) {
  return (
    <fieldset>
      <legend className="font-medium mb-3">{title}</legend>
      <div className="grid sm:grid-cols-3 gap-3">
        {(
          [
            ["Sq", "Albanian"],
            ["En", "English"],
            ["De", "German"],
          ] as const
        ).map(([suffix, language]) => (
          <label className="field" key={suffix}>
            {language}
            <input
              name={`${prefix}${suffix}`}
              required
              minLength={2}
              maxLength={80}
              placeholder={language === "English" ? "Example name" : "Translated name"}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const groupIcons = [
  ["Package", "General goods"],
  ["Laptop", "Electronics"],
  ["Armchair", "Home"],
  ["Wrench", "Tools"],
  ["BookOpen", "Books"],
  ["Baby", "Children"],
  ["Dumbbell", "Sports"],
] as const;

export function CategoryCreateForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="panel space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setBusy(true);
        setError("");
        setMessage("");
        startTransition(async () => {
          try {
            const result = await createCategoryAction({
              parentId: "",
              names: namesFrom(values, "name"),
              icon: String(values.get("icon") ?? "Package"),
            });
            if (result.error) {
              setError(result.error);
            } else {
              form.reset();
              setMessage(
                "Category created. Next: open “2. Add a subcategory” and choose this category.",
              );
              router.refresh();
            }
          } catch {
            setError("Could not add the category. Please try again.");
          } finally {
            setBusy(false);
          }
        });
      }}
    >
      <div>
        <h2 className="mb-1">1. Add a category</h2>
        <p className="muted text-sm">
          Top-level groups like Electronics or Vehicles. Subcategories go inside these.
        </p>
      </div>
      <NameFields prefix="name" title="Category name" />
      <label className="field">
        Group icon
        <select name="icon" defaultValue="Package">
          {groupIcons.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
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
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Adding…" : "Add category"}
      </button>
    </form>
  );
}

export function SubcategoryCreateForm({ groups }: { groups: CatalogGroup[] }) {
  const router = useRouter();
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="panel space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!parentId) {
          setError("Choose which category this subcategory belongs to.");
          return;
        }
        const form = event.currentTarget;
        const values = new FormData(form);
        setBusy(true);
        setError("");
        setMessage("");
        startTransition(async () => {
          try {
            const result = await createCategoryAction({
              parentId,
              names: namesFrom(values, "name"),
              icon: "Package",
            });
            if (result.error) {
              setError(result.error);
            } else {
              form.reset();
              setParentId("");
              setMessage(
                "Subcategory created. Next: open “3. Add fields to a subcategory”.",
              );
              router.refresh();
            }
          } catch {
            setError("Could not add the subcategory. Please try again.");
          } finally {
            setBusy(false);
          }
        });
      }}
    >
      <div>
        <h2 className="mb-1">2. Add a subcategory</h2>
        <p className="muted text-sm">
          Nested items like Phones under Electronics. Sellers pick these when posting.
        </p>
      </div>
      {groups.length === 0 ? (
        <p className="muted text-sm">
          Create a category first. Then you can add subcategories under it.
        </p>
      ) : (
        <>
          <label className="field">
            Parent category
            <select
              name="parentId"
              required
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">Choose a category…</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <NameFields prefix="name" title="Subcategory name" />
        </>
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
      <button className="btn btn-primary" disabled={busy || groups.length === 0}>
        {busy ? "Adding…" : "Add subcategory"}
      </button>
    </form>
  );
}

export function FieldCreateForm({
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
  const [type, setType] = useState<FieldType>("TEXT");
  const [options, setOptions] = useState<Names[]>([
    { sq: "", en: "", de: "" },
    { sq: "", en: "", de: "" },
  ]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = subcategories.find((category) => category.id === categoryId);

  return (
    <form
      className="panel space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        const minimum = String(values.get("min") ?? "").trim();
        const maximum = String(values.get("max") ?? "").trim();
        setBusy(true);
        setError("");
        setMessage("");
        startTransition(async () => {
          try {
            const result = await createFieldAction({
              categoryId,
              names: namesFrom(values, "field"),
              type,
              required: values.has("required"),
              filterable: type === "SELECT" && values.has("filterable"),
              unit: type === "NUMBER" ? String(values.get("unit") ?? "") : "",
              min: type === "NUMBER" && minimum ? Number(minimum) : null,
              max: type === "NUMBER" && maximum ? Number(maximum) : null,
              options: type === "SELECT" ? options : [],
            });
            if (result.error) {
              setError(result.error);
            } else {
              form.reset();
              setCategoryId("");
              setType("TEXT");
              setOptions([
                { sq: "", en: "", de: "" },
                { sq: "", en: "", de: "" },
              ]);
              setMessage("Listing field added to the selected subcategory.");
            }
          } catch {
            setError("Could not add the field. Please try again.");
          } finally {
            setBusy(false);
          }
        });
      }}
    >
      <div>
        <h2 className="mb-1">Add a listing field</h2>
        <p className="muted text-sm">
          Ask sellers for details specific to a subcategory.
        </p>
      </div>
      <label className="field">
        Subcategory
        <select
          required
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">Choose a subcategory</option>
          {subcategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.group} / {category.name}
            </option>
          ))}
        </select>
      </label>
      <NameFields prefix="field" title="Field label" />
      <label className="field">
        Answer type
        <select
          value={type}
          onChange={(event) => setType(event.target.value as FieldType)}
        >
          <option value="TEXT">Text</option>
          <option value="NUMBER">Number</option>
          <option value="SELECT">Choose from options</option>
          <option value="BOOLEAN">Yes or no</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="required" disabled={selected?.hasListings} />
        Sellers must answer this field
      </label>
      {selected?.hasListings && (
        <p className="muted text-sm">
          This subcategory already has listings, so new fields must be optional.
        </p>
      )}
      {type === "NUMBER" && (
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="field">
            Unit, if needed
            <input name="unit" maxLength={20} placeholder="km, m²…" />
          </label>
          <label className="field">
            Minimum, if needed
            <input name="min" type="number" step="any" />
          </label>
          <label className="field">
            Maximum, if needed
            <input name="max" type="number" step="any" />
          </label>
        </div>
      )}
      {type === "SELECT" && (
        <fieldset className="space-y-4">
          <legend className="font-medium">Choices</legend>
          <p className="muted text-sm">Give every choice a distinct English name.</p>
          {options.map((option, index) => (
            <div className="rounded-xl border border-stone-200 p-4" key={index}>
              <div className="flex items-center justify-between mb-3">
                <strong className="text-sm">Choice {index + 1}</strong>
                {options.length > 2 && (
                  <button
                    type="button"
                    className="text-sm underline text-stone-500"
                    onClick={() =>
                      setOptions(options.filter((_, current) => current !== index))
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {(
                  [
                    ["sq", "Albanian"],
                    ["en", "English"],
                    ["de", "German"],
                  ] as const
                ).map(([locale, language]) => (
                  <label className="field" key={locale}>
                    {language}
                    <input
                      required
                      minLength={2}
                      maxLength={80}
                      value={option[locale]}
                      onChange={(event) => {
                        const next = [...options];
                        next[index] = { ...option, [locale]: event.target.value };
                        setOptions(next);
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
          {options.length < 20 && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setOptions([...options, { sq: "", en: "", de: "" }])}
            >
              Add another choice
            </button>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="filterable"
              disabled={selected?.hasChoiceFilter}
            />
            Let buyers filter search results by this field
          </label>
          {selected?.hasChoiceFilter && (
            <p className="muted text-sm">
              This subcategory already has a choice filter in search.
            </p>
          )}
        </fieldset>
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
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Adding…" : "Add listing field"}
      </button>
    </form>
  );
}
