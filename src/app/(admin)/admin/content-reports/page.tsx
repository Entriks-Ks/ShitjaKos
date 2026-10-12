import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getContentReports } from "@/services/content-reports";
import { AdminContentReportControl } from "@/components/admin-content-report-control";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const parsed = Number(query.page ?? 1);
  const page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  const reports = await getContentReports(await requireUser(), page);
  return <section className="space-y-5"><h1 className="text-2xl font-semibold">Listing & shop reports</h1><p className="text-stone-600">Review community reports. Submitting a report does not hide content.</p>
    {reports.slice(0,20).map(report => <article key={report.id} className="panel p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{report.targetTitle}</h2><span className="text-sm">{report.status}</span></div><p className="mt-2 text-sm text-stone-500">{report.targetKind} · {report.reason} · {report.createdAt.toISOString().slice(0,10)}</p><p className="mt-3 whitespace-pre-wrap break-words">{report.details}</p><p className="mt-2 text-xs text-stone-500">Target ID: {report.targetId}</p>{report.targetKind === "LISTING" && <Link className="text-sm underline" href={`/listings/${report.targetId}`}>View listing</Link>}
    {report.decisionNote && <p className="mt-3 whitespace-pre-wrap break-words">Decision note: {report.decisionNote}</p>}
    {["OPEN", "INVESTIGATING"].includes(report.status) && <AdminContentReportControl id={report.id} status={report.status} />}</article>)}
    {!reports.length && <p className="panel p-5">No reports on this page.</p>}
    <nav className="flex gap-4" aria-label="Report pages">{page > 1 && <Link href={`?page=${page-1}`}>Previous</Link>}{reports.length > 20 && <Link href={`?page=${page+1}`}>Next</Link>}</nav>
  </section>;
}
