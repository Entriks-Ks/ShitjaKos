"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { businessAction } from "@/app/actions";
import { cities } from "@/lib/catalog";
export function BusinessForm() {
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
          const r = await businessAction(Object.fromEntries(f));
          if (r.error) setError(r.error);
          else {
            router.push("/dashboard");
          }
        } catch {
          setError("Could not create business.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid sm:grid-cols-2 gap-5">
        <label className="field">
          Registered legal name
          <input name="legalName" required minLength={3} maxLength={150} />
        </label>
        <label className="field">
          Public shop name
          <input name="publicName" required minLength={3} maxLength={100} />
        </label>
        <label className="field">
          Public email
          <input name="email" type="email" required />
        </label>
        <label className="field">
          Public phone
          <input name="phone" type="tel" required />
        </label>
        <label className="field">
          City
          <select name="city">
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Shop address
          <input name="address" maxLength={200} />
        </label>
      </div>
      <label className="field">
        About your business
        <textarea name="description" required minLength={20} maxLength={2000} />
      </label>
      <label className="field">
        Opening hours
        <input name="openingHours" placeholder="Mon–Fri 09:00–18:00" maxLength={300} />
      </label>
      <p className="notice">
        Your business will be reviewed before its shop and inventory become public.
        Business contact details are public after approval. Your personal account remains
        separate.
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Create business & request review"}
      </button>
    </form>
  );
}
