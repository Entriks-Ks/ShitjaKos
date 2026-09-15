import { ListingForm } from "@/components/listing-form";
import { requireUser } from "@/lib/session";
import { getCategories } from "@/repositories/catalog";
export const metadata = {
  title: "Create a listing",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await requireUser();
  const categories = await getCategories();
  return (
    <>
      <main className="wrap max-w-3xl py-10">
        <h1>Give your next listing a home.</h1>
        <p className="muted mb-8">
          Your personal listings and your shop inventory stay separate.
        </p>
        <ListingForm
          categories={categories}
          businesses={user.memberships.map((m) => m.business)}
        />
      </main>
    </>
  );
}
