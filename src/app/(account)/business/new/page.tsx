import { BusinessForm } from "@/components/business-form";
import { requireUser } from "@/lib/session";
export const metadata = { title: "Open a shop", robots: { index: false, follow: false } };
export default async function Page() {
  await requireUser();
  return (
    <>
      <main className="wrap max-w-3xl py-10">
        <p className="eyebrow">PËR BIZNESET LOKALE</p>
        <h1>Make room for your business.</h1>
        <p className="muted mb-7">
          One shop, all your inventory. Owned by your business.
        </p>
        <BusinessForm />
      </main>
    </>
  );
}
