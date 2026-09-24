import { AccountShops } from "@/components/account-shops";
import { BusinessStaffInvitations } from "@/components/business-staff-invitations";
import { requireUser } from "@/lib/session";
import { getMyStaffInvitations } from "@/services/business-staff";

export const metadata = {
  title: "My shops",
  robots: { index: false, follow: false },
};

export default async function ShopsPage() {
  const user = await requireUser();

  const invitations = user.emailVerified
    ? await getMyStaffInvitations(user)
    : [];

  return (
    <>
      <header className="workspace-heading">
        <p className="eyebrow">YOUR BUSINESSES</p>
        <h1>My shops</h1>
        <p className="muted">
          Manage your businesses, memberships, and invitations.
        </p>
      </header>

      <BusinessStaffInvitations invitations={invitations} />

      <AccountShops memberships={user.memberships} />
    </>
  );
}