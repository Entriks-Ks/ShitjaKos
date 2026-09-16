"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save } from "lucide-react";
import { cities } from "@/lib/catalog";
import { ProfileInput } from "@/lib/validations/profile";
import { updateProfileAction } from "@/app/(account)/dashboard/profile/actions";

export function ProfileForm({ initial }: { initial: ProfileInput }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  function change(key: keyof ProfileInput, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }
  return (
    <form
      className="workspace-card profile-editor"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        setSaved(false);
        try {
          const result = await updateProfileAction(values);
          if (result.error) setError(result.error);
          else {
            setSaved(true);
            router.refresh();
          }
        } catch {
          setError("Could not connect. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="section-heading">
        <div>
          <h2>Personal details</h2>
          <p>Your account information and how buyers know you.</p>
        </div>
      </div>
      <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-5">
        <label className="field">
          Your name
          <input
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            value={values.name}
            onChange={(e) => change("name", e.target.value)}
          />
          <small>Used for your account greeting.</small>
        </label>
        <label className="field">
          Public seller name
          <input
            required
            minLength={2}
            maxLength={100}
            value={values.displayName}
            onChange={(e) => change("displayName", e.target.value)}
          />
          <small>Shown on your personal listings.</small>
        </label>
        <label className="field">
          Phone number
          <input
            type="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="+383 …"
            value={values.phone}
            onChange={(e) => change("phone", e.target.value)}
          />
          <small>
            Private account detail. Choose phone visibility separately on each listing.
          </small>
        </label>
        <label className="field">
          City
          <select value={values.city} onChange={(e) => change("city", e.target.value)}>
            {cities.map((city) => (
              <option key={city}>{city}</option>
            ))}
          </select>
        </label>
        <label className="field sm:col-span-2">
          About you
          <textarea
            maxLength={500}
            rows={4}
            placeholder="A little about you and what you like to sell."
            value={values.bio}
            onChange={(e) => change("bio", e.target.value)}
          />
          <small>{values.bio.length}/500 characters</small>
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="notice error mt-5">
          {error}
        </p>
      )}
      <div className="editor-footer">
        {saved ? (
          <span role="status" className="save-success">
            <Check size={16} /> Profile saved
          </span>
        ) : (
          <span className="muted">You can update these details any time.</span>
        )}
        <button className="btn btn-primary" disabled={busy}>
          <Save size={16} />
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
