"use client";
import { useState, useTransition } from "react";
import { reviewContentReportAction } from "@/actions/content-reports";
export function AdminContentReportControl({ id, status }: { id: string; status: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return <form className="mt-4 space-y-3" action={data => { setError(""); start(async () => { try { const result = await reviewContentReportAction({ id, expectedStatus: status, status: data.get("status"), note: data.get("note") }); if (!result.ok) setError(result.error); } catch { setError("Connection problem. Please retry."); } }); }}>
    <label className="block">Decision<select name="status" disabled={pending} className="ml-3 rounded-lg border p-2"><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option></select></label>
    <label className="block">Internal decision note<textarea name="note" required minLength={5} maxLength={1000} disabled={pending} className="mt-2 block w-full rounded-lg border p-3" /></label>
    <p className="text-xs text-stone-500">This records the decision only. It does not hide content or suspend accounts.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button disabled={pending} className="btn btn-primary">{pending ? "Saving…" : "Save decision"}</button>
  </form>;
}
