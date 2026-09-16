import Link from "next/link";
import { Mail, Phone, MapPin, ShieldCheck, Pencil } from "lucide-react";
import { requireUser } from "@/lib/session";
import { SignOut } from "@/components/auth-form";
import { WorkspaceNav } from "@/components/workspace-nav";
import { StatusBadge } from "@/components/workspace-ui";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className="wrap workspace-layout account-workspace">
      <aside className="workspace-sidebar">
        <div className="account-identity">
          <div className="profile-avatar">{initials || "SK"}</div>
          <h2>{user.profile?.displayName || user.name}</h2>
          <p>
            Member since{" "}
            {user.createdAt.toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
          </p>
          <StatusBadge tone={user.emailVerified ? "green" : "amber"}>
            {user.emailVerified ? "Email verified" : "Email not verified"}
          </StatusBadge>
        </div>
        <WorkspaceNav />
        <div className="account-contact">
          <p>
            <Mail size={15} />
            <span>{user.email}</span>
          </p>
          <p>
            <Phone size={15} />
            <span>{user.profile?.phone || "No phone number added"}</span>
          </p>
          <p>
            <MapPin size={15} />
            <span>{user.profile?.city || "City not added"}</span>
          </p>
          <Link href="/dashboard/profile">
            <Pencil size={13} />
            Edit your details
          </Link>
        </div>
        {user.role === "ADMIN" && (
          <Link href="/admin" className="admin-shortcut">
            <ShieldCheck size={18} />
            Administration
          </Link>
        )}
        <div className="workspace-signout">
          <SignOut />
        </div>
      </aside>
      <main className="workspace-content">{children}</main>
    </div>
  );
}
