import Link from "next/link";
import { LockKeyhole, Mail } from "lucide-react";
import { requireUser } from "@/lib/session";
import { cities } from "@/lib/catalog";
import { ProfileForm } from "@/components/profile-form";
import { StatusBadge } from "@/components/workspace-ui";
export const metadata = {
  title: "Personal details",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await requireUser();
  const city = cities.find((city) => city === user.profile?.city) ?? "Prishtina";
  return (
    <>
      <header className="workspace-heading">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>Make yourself at home.</h1>
        <p className="muted">A few details help make your account feel like yours.</p>
      </header>
      <ProfileForm
        initial={{
          name: user.name,
          displayName: user.profile?.displayName || user.name,
          phone: user.profile?.phone || "",
          city,
          bio: user.profile?.bio || "",
        }}
      />
      <section className="workspace-card mt-6">
        <div className="section-heading">
          <div>
            <h2>Sign-in & security</h2>
            <p>Keep your account accessible and protected.</p>
          </div>
          <LockKeyhole size={22} />
        </div>
        <div className="security-row">
          <div>
            <Mail size={19} />
            <span>
              <strong>Email address</strong>
              <small>{user.email}</small>
            </span>
          </div>
          <StatusBadge tone={user.emailVerified ? "green" : "amber"}>
            {user.emailVerified ? "Verified" : "Unverified"}
          </StatusBadge>
        </div>
        <div className="security-row">
          <div>
            <LockKeyhole size={19} />
            <span>
              <strong>Password</strong>
              <small>Use an email link to set a new password.</small>
            </span>
          </div>
          <Link className="btn btn-outline" href="/forgot-password">
            Reset password
          </Link>
        </div>
      </section>
    </>
  );
}
