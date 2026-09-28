"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { businessAction, clearShopImageAction, saveShopImageAction, updateBusinessAction } from "@/actions/businesses";
import { cities } from "@/lib/catalog";
import { CountryCityFields } from "@/components/country-city-fields";

type BusinessInitial = {
  id: string;
  legalName: string;
  publicName: string;
  email: string;
  phone: string;
  city: string;
  description: string;
  address: string;
  openingHours: string;
  logoSrc: string | null;
  backgroundSrc: string | null;
};

export function BusinessForm({ initial }: { initial?: BusinessInitial }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const f = new FormData(e.currentTarget);
          const values = Object.fromEntries(f);

          const r = initial
            ? await updateBusinessAction(initial.id, values)
            : await businessAction(values);
          if (r.error) setError(r.error);
          else {
            router.push("/dashboard/shops");
            router.refresh();
          }
        } catch {
          setError("Could not save the business.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid sm:grid-cols-2 gap-5">
        <label className="field">
          Registered legal name
          <input
            name="legalName"
            required
            minLength={3}
            maxLength={150}
            defaultValue={initial?.legalName ?? ""}
          />
        </label>
        <label className="field">
          Public shop name
          <input
            name="publicName"
            required
            minLength={3}
            maxLength={100}
            defaultValue={initial?.publicName ?? ""}
          />
        </label>
        <label className="field">
          Public email
          <input name="email" type="email" required defaultValue={initial?.email ?? ""} />
        </label>
        <label className="field">
          Public phone
          <input name="phone" type="tel" required defaultValue={initial?.phone ?? ""} />
        </label>
        <CountryCityFields defaultCity={initial?.city ?? cities[0]} />
        <label className="field">
          Shop address
          <input name="address" maxLength={200} defaultValue={initial?.address ?? ""} />
        </label>
      </div>
      <label className="field">
        About your business
        <textarea
          name="description"
          required
          minLength={20}
          maxLength={2000}
          defaultValue={initial?.description ?? ""}
        />
      </label>
      <label className="field">
        Opening hours
        <input
          name="openingHours"
          placeholder="Mon–Fri 09:00–18:00"
          maxLength={300}
          defaultValue={initial?.openingHours ?? ""}
        />
      </label>
      {initial ? (
        <ShopImages
          businessId={initial.id}
          logoSrc={initial.logoSrc}
          backgroundSrc={initial.backgroundSrc}
        />
      ) : (
        <p className="notice">
          After the shop is created you can add a logo and a background image.
        </p>
      )}
      {!initial && (
        <p className="notice">
          Your business will be reviewed before its shop and inventory become public.
          Business contact details are public after approval.
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <button className="btn btn-primary" disabled={busy}>
        {busy
          ? "Saving…"
          : initial
            ? "Save business changes"
            : "Create business & request review"}
      </button>
    </form>
  );
}

function ShopImages({
  businessId,
  logoSrc,
  backgroundSrc,
}: {
  businessId: string;
  logoSrc: string | null;
  backgroundSrc: string | null;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <ShopImageField
        businessId={businessId}
        kind="logo"
        label="Shop logo"
        hint="Square JPEG, PNG or WebP, up to 8 MB. Shown on the shop page and shop cards."
        src={logoSrc}
      />
      <ShopImageField
        businessId={businessId}
        kind="background"
        label="Shop background"
        hint="Wide JPEG, PNG or WebP, up to 8 MB. Used behind the shop name."
        src={backgroundSrc}
      />
    </div>
  );
}

function ShopImageField({
  businessId,
  kind,
  label,
  hint,
  src,
}: {
  businessId: string;
  kind: "logo" | "background";
  label: string;
  hint: string;
  src: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="field space-y-3">
      <span>{label}</span>
      <p className="muted text-sm">{hint}</p>
      {src ? (
        <div
          className={
            kind === "logo"
              ? "relative h-24 w-24 overflow-hidden rounded-xl bg-stone-100"
              : "relative h-28 w-full overflow-hidden rounded-xl bg-stone-100"
          }
        >
          <Image unoptimized fill className="object-cover" src={src} alt="" />
        </div>
      ) : null}
      <input
        disabled={busy}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setError("");
          try {
            const form = new FormData();
            form.set("file", file);
            const r = await saveShopImageAction(businessId, kind, form);
            if (r.error) setError(r.error);
            else router.refresh();
          } catch {
            setError("Could not upload image.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {src ? (
        <button
          type="button"
          disabled={busy}
          className="text-xs text-red-700"
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const r = await clearShopImageAction(businessId, kind);
              if (r.error) setError(r.error);
              else router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          Remove {kind === "logo" ? "logo" : "background"}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="notice error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
