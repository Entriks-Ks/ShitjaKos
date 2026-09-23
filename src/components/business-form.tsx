"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { businessAction, updateBusinessAction } from "@/actions/businesses";
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
