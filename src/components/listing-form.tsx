"use client";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { translated, optionLabel } from "@/lib/catalog";
import { CountryCityFields } from "@/components/country-city-fields";
import { saveListingAction, statusAction } from "@/actions/listings";
import type { getCategories } from "@/repositories/catalog";
import type { ListingInput } from "@/lib/validations/listing";
import Image from "next/image";
type Initial = ListingInput & {
  media: { id: string; altText: string }[];
  status: string;
  moderationStatus: string;
};
const subscribe = () => () => {};
export function ListingForm({
  categories,
  businesses,
  initial,
}: {
  categories: Awaited<ReturnType<typeof getCategories>>;
  businesses: { id: string; publicName: string; reviewStatus: string }[];
  initial?: Initial;
}) {
  const router = useRouter();
  const [categoryId, setCategory] = useState(initial?.categoryId ?? "");
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    initial?.attributes ?? {},
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const category = categories.find((c) => c.id === categoryId);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const result = await saveListingAction({
        id: initial?.id,
        version: initial?.version ?? 1,
        categoryId,
        owner: String(f.get("owner")),
        intent: String(f.get("intent")),
        title: String(f.get("title")),
        description: String(f.get("description")),
        price: String(f.get("price")),
        city: String(f.get("city")),
        condition: String(f.get("condition")),
        negotiable: f.has("negotiable"),
        phoneVisible: f.has("phoneVisible"),
        contactPhone: String(f.get("contactPhone") ?? ""),
        attributes,
      });
      if (result.error) setError(result.error);
      else {
        router.push(`/listings/${result.id}/edit`);
      }
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <form onSubmit={save} className="panel space-y-6">
        <div>
          <p className="eyebrow">01 · THE DETAILS</p>
          <h2>{initial ? "Edit your listing" : "What would you like to list?"}</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <label className="field">
            Listing intent
            <select name="intent" defaultValue={initial?.intent ?? "FOR_SALE"}>
              <option value="FOR_SALE">For sale</option>
              <option value="WANTED">Wanted — looking to buy</option>
            </select>
          </label>
          <label className="field">
            Publish as
            <select
              name="owner"
              aria-label="Publish as"
              defaultValue={initial?.owner ?? "personal"}
              disabled={!!initial}
            >
              <option value="personal">Me — private seller</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.publicName}
                  {b.reviewStatus !== "APPROVED" ? " (review pending)" : ""}
                </option>
              ))}
            </select>
            {initial && <input type="hidden" name="owner" value={initial.owner} />}
          </label>
        </div>
        <label className="field">
          Category
          <select
            aria-label="Category"
            required
            value={categoryId}
            onChange={(e) => {
              setCategory(e.target.value);
              setAttributes({});
            }}
          >
            <option value="">Choose a subcategory</option>
            {categories
              .filter((c) => !c.parentId)
              .map((parent) => (
                <optgroup key={parent.id} label={translated(parent.translations, "en")}>
                  {categories
                    .filter((c) => c.parentId === parent.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {translated(c.translations, "en")}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
        </label>
        <label className="field">
          Title
          <input
            name="title"
            required
            minLength={5}
            maxLength={120}
            placeholder="e.g. iPhone 15 Pro, 256 GB, excellent condition"
            defaultValue={initial?.title}
          />
        </label>
        <label className="field">
          Description
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={6000}
            placeholder="Tell buyers about the item, its condition and pickup arrangements."
            defaultValue={initial?.description}
          />
        </label>
        {!!category?.attributes.length && (
          <div className="rounded-xl bg-stone-50 p-5 space-y-4">
            <h3 className="font-semibold text-sm">About this item</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {category.attributes.map((a) => (
                <label className="field" key={a.id}>
                  {translated(a.translations, "en")}
                  {a.unit ? ` (${a.unit})` : ""}
                  {a.required ? " *" : ""}
                  {a.type === "SELECT" ? (
                    <select
                      required={a.required}
                      value={String(attributes[a.id] ?? "")}
                      onChange={(e) =>
                        setAttributes({ ...attributes, [a.id]: e.target.value })
                      }
                    >
                      <option value="">Choose an option</option>
                      {(
                        a.options as { value: string; labels: Record<string, string> }[]
                      ).map((o) => (
                        <option key={o.value} value={o.value}>
                          {optionLabel(o, "en")}
                        </option>
                      ))}
                    </select>
                  ) : a.type === "BOOLEAN" ? (
                    <select
                      required={a.required}
                      value={
                        attributes[a.id] === undefined ? "" : String(attributes[a.id])
                      }
                      onChange={(e) =>
                        setAttributes({
                          ...attributes,
                          [a.id]:
                            e.target.value === "" ? undefined : e.target.value === "true",
                        })
                      }
                    >
                      <option value="">Choose</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <input
                      type={a.type === "NUMBER" ? "number" : "text"}
                      min={a.min ?? undefined}
                      max={a.max ?? undefined}
                      step="any"
                      required={a.required}
                      value={String(attributes[a.id] ?? "")}
                      onChange={(e) =>
                        setAttributes({ ...attributes, [a.id]: e.target.value })
                      }
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <label className="field">
            Price / wanted budget (€)
            <input
              type="number"
              name="price"
              required
              min="0"
              step="0.01"
              max="99999999"
              defaultValue={initial?.price}
            />
          </label>
          <label className="field">
            Condition
            <select name="condition" defaultValue={initial?.condition ?? "USED"}>
              {["NEW", "LIKE_NEW", "USED", "DEFECTIVE", "FOR_PARTS"].map((v) => (
                <option key={v} value={v}>
                  {v.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <CountryCityFields defaultCity={initial?.city ?? "Prishtina"} />
        </div>
        <label className="flex gap-2 text-sm items-center">
          <input type="checkbox" name="negotiable" defaultChecked={initial?.negotiable} />
          Price is negotiable
        </label>
        <div className="border-t border-stone-200 pt-5">
          <label className="field">
            Contact phone (optional)
            <input name="contactPhone" type="tel" defaultValue={initial?.contactPhone} />
          </label>
          <label className="flex gap-2 text-sm items-center mt-3">
            <input
              type="checkbox"
              name="phoneVisible"
              defaultChecked={initial?.phoneVisible}
            />
            Show this number publicly on the listing
          </label>
        </div>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save changes" : "Save draft & add photos"}
        </button>
        <p className="text-xs text-stone-500">
          Listings appear immediately after you publish. Business listings require an
          approved shop.
        </p>
      </form>
      {initial?.id && (
        <PhotoEditor id={initial.id} media={initial.media} status={initial.status} />
      )}
    </div>
  );
}
function PhotoEditor({
  id,
  media,
  status,
}: {
  id: string;
  media: { id: string; altText: string }[];
  status: string;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="panel space-y-5">
      <div>
        <p className="eyebrow">02 · PHOTOS & PUBLICATION</p>
        <h2>Show it from its best side.</h2>
        <p className="muted">
          Add 1–12 JPEG, PNG or WebP images, up to 8 MB each. The first photo is the
          cover.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {media.map((m, i) => (
          <div key={m.id}>
            <div className="relative aspect-square rounded-lg overflow-hidden bg-stone-100">
              <Image
                unoptimized
                fill
                className="object-cover"
                src={`/api/media/${m.id}`}
                alt={m.altText}
              />
            </div>
            <button
              disabled={busy}
              className="text-xs mt-2 text-red-700"
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const r = await fetch(`/api/listings/${id}/media?mediaId=${m.id}`, {
                    method: "DELETE",
                  });
                  if (!r.ok) setError("Could not delete image. Retry.");
                  else router.refresh();
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove photo {i + 1}
            </button>
          </div>
        ))}
      </div>
      <label className="field">
        Add photos
        <input
          disabled={!hydrated || busy || media.length >= 12}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            setBusy(true);
            setError("");
            try {
              for (const file of files) {
                const form = new FormData();
                form.set("file", file);
                const r = await fetch(`/api/listings/${id}/media`, {
                  method: "POST",
                  body: form,
                });
                const data = await r.json();
                if (!r.ok) {
                  setError(data.error);
                  break;
                }
              }
              router.refresh();
            } catch {
              setError("Photo upload failed. Try again.");
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {busy && (
        <p role="status" className="muted">
          Processing photos…
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {["DRAFT", "PAUSED"].includes(status) && (
        <StatusButton id={id} target="PUBLISHED" label="Publish listing" />
      )}
    </section>
  );
}
export function StatusButton({
  id,
  target,
  label,
}: {
  id: string;
  target: "PUBLISHED" | "PAUSED" | "SOLD" | "CLOSED";
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="btn btn-outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await statusAction(id, target);
            setError(r.error ?? "");
          } catch {
            setError("Could not update listing.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : label}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-700 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
