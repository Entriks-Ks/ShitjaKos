import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isStaff } from "@/lib/permissions";
import { getReviewQueue } from "@/repositories/reviews";
import { reviewAction } from "@/app/actions";
export const metadata = {
  title: "Review queue",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await requireUser();
  if (!isStaff(user)) notFound();
  const { businesses, listings, audits } = await getReviewQueue(user.id);
  return (
    <>
      <main className="wrap py-10">
        <h1>Review queue</h1>
        <Link className="btn btn-outline mb-6" href="/admin/catalog">
          Manage categories &amp; listing fields
        </Link>
        <p className="muted mb-8">
          Review real information. Every decision is recorded. You cannot review your own
          business or listings.
        </p>
        <h2 className="mb-4">Businesses ({businesses.length})</h2>
        <div className="space-y-4 mb-10">
          {businesses.map((b) => (
            <article className="panel" key={b.id}>
              <h3 className="font-semibold">{b.publicName}</h3>
              <p className="muted">
                Legal name: {b.legalName} · {b.city} · {b.email} · {b.phone}
              </p>
              <p className="text-sm my-3">{b.description}</p>
              <Review id={b.id} kind="business" />
            </article>
          ))}
        </div>
        <h2 className="mb-4">Listings ({listings.length})</h2>
        <div className="space-y-4">
          {listings.map((l) => (
            <article className="panel" key={l.id}>
              <Link className="font-semibold underline" href={`/listings/${l.id}`}>
                {l.title}
              </Link>
              <p className="muted mb-3">
                {l.business?.publicName ?? l.personalProfile?.displayName}
              </p>
              <Review id={l.id} kind="listing" />
            </article>
          ))}
        </div>
        <h2 className="mt-10 mb-4">Recent audit history</h2>
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Time</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a.id} className="border-t border-stone-100">
                  <td className="py-3">{a.createdAt.toLocaleString("en-GB")}</td>
                  <td>{a.action}</td>
                  <td className="text-xs">{a.targetId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
function Review({ id, kind }: { id: string; kind: string }) {
  return (
    <form action={reviewAction} className="flex flex-wrap gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <input
        className="max-w-md"
        aria-label="Review reason"
        name="reason"
        required
        minLength={5}
        maxLength={1000}
        placeholder="Record checks performed and decision reason"
      />
      <button className="btn btn-primary" name="decision" value="APPROVED">
        Approve
      </button>
      <button className="btn btn-outline" name="decision" value="REJECTED">
        Reject
      </button>
    </form>
  );
}
