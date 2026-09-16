import { AccountShops } from "@/components/account-shops";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "My shops",
  robots: { index: false, follow: false },
};

export default async function ShopsPage() {
  const user = await requireUser();
  return (
    <>
      <header className="workspace-heading">
        <p className="eyebrow">YOUR BUSINESSES</p>
        <h1>My shops</h1>
        <p className="muted">
          View your businesses, check their approval status, and visit your shops.
        </p>
      </header>
      <AccountShops memberships={user.memberships} />
    </>
  );
}
