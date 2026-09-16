import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { requireUser } from "@/lib/session";
import { isStaff } from "@/lib/permissions";
import { ShieldCheck } from "lucide-react";
import { WorkspaceNav } from "@/components/workspace-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireUser();
  if (!isStaff(actor)) notFound();

  return (
    <>
      <Header signedIn />
      <div className="wrap workspace-layout admin-workspace">
        <aside className="workspace-sidebar admin-sidebar">
          <div className="admin-identity">
            <span>
              <ShieldCheck size={24} />
            </span>
            <h2>Administration</h2>
            <p>Keep the marketplace thriving.</p>
          </div>
          <WorkspaceNav admin />
          <div className="admin-operator">
            <span className="operator-avatar">{actor.name.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{actor.name}</strong>
              <small>Administrator</small>
            </div>
          </div>
        </aside>
        <main className="workspace-content">{children}</main>
      </div>
    </>
  );
}
