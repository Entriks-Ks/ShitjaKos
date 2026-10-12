"use client";
import { useId, useRef, useState, useTransition } from "react";
import { Flag, MoreHorizontal, X } from "lucide-react";
import { submitContentReportAction } from "@/actions/content-reports";
export function ContentReportControl({ targetKind, targetId }: { targetKind: "LISTING" | "BUSINESS"; targetId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const heading = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const label = targetKind === "LISTING" ? "listing" : "shop";
  return <>
    <details ref={menu} className="relative inline-block" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false; }} onKeyDown={e => { if (e.key === "Escape") { e.currentTarget.open = false; trigger.current?.focus(); } }}>
      <summary ref={trigger} aria-label={`More ${label} options`} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-stone-200 bg-white hover:bg-stone-50 [&::-webkit-details-marker]:hidden"><MoreHorizontal size={18} /></summary>
      <div className="absolute right-0 top-11 z-30 w-44 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
        <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-stone-100" onClick={() => { if (menu.current) menu.current.open = false; setError(""); setDone(false); dialog.current?.showModal(); }}><Flag size={15} />Report {label}</button>
      </div>
    </details>
    <dialog ref={dialog} aria-labelledby={heading} onCancel={e => { if (pending) e.preventDefault(); }} onClose={() => trigger.current?.focus()} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-xl backdrop:bg-black/40">
      <div className="mb-5 flex items-center justify-between"><h2 id={heading} className="text-lg font-semibold">{done ? "Report received" : `Report ${label}`}</h2><button type="button" disabled={pending} aria-label="Close report" onClick={() => dialog.current?.close()} className="rounded-full p-2 hover:bg-stone-100"><X size={18} /></button></div>
      {done ? <div className="space-y-5"><p role="status">Our team will review your report. Reporting does not automatically remove this {label}.</p><button type="button" className="btn btn-primary" onClick={() => dialog.current?.close()}>Done</button></div> :
      <form className="space-y-4" action={data => { setError(""); start(async () => { try { const result = await submitContentReportAction({ targetKind, targetId, reason: data.get("reason"), details: data.get("details") }); if (result.ok) setDone(true); else setError(result.error); } catch { setError("Connection problem. Please retry."); } }); }}>
        <label className="block space-y-2"><span>Reason</span><select name="reason" required defaultValue="" disabled={pending} className="w-full rounded-xl border border-stone-300 bg-white p-3"><option value="" disabled>Select a reason</option><option value="SCAM">Scam or suspicious activity</option><option value="PROHIBITED">Prohibited content</option><option value="MISLEADING">Misleading information</option><option value="DUPLICATE">Spam or duplicate</option><option value="OTHER">Something else</option></select></label>
        <label className="block space-y-2"><span>Additional details</span><textarea name="details" maxLength={1000} rows={4} disabled={pending} className="w-full rounded-xl border border-stone-300 p-3" /></label>
        <p className="text-xs text-stone-500">Your report is private. Your identity is not displayed to the seller.</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={pending} className="btn btn-outline" onClick={() => dialog.current?.close()}>Cancel</button><button disabled={pending} className="btn btn-primary">{pending ? "Submitting…" : "Submit report"}</button></div>
      </form>}
    </dialog>
  </>;
}
