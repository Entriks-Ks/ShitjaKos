import { notFound } from "next/navigation";

import Link from "@/components/navigation-link";
import { BusinessStaffForm } from "@/components/business-staff-form";
import { requireUser } from "@/lib/session";
import { MailPlus, Users, ShieldCheck } from "lucide-react";
import styles from "@/components/business-staff.module.css";
import { BusinessStaffError, getBusinessStaff } from "@/services/business-staff";

export const metadata = {
  title: "Business staff",
  robots: { index: false, follow: false },
};

export default async function BusinessStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireUser();

  const data = await getBusinessStaff(actor, id).catch((error) => {
    if (error instanceof BusinessStaffError) {
      notFound();
    }

    throw error;
  });

  return (
    <main className={`wrap ${styles.page}`}>
      <Link href="/dashboard/shops" className="text-action inline-flex">
        ← Back to your shops
      </Link>

      <header className={styles.heading}>
        <p className="eyebrow">YOUR TEAM</p>
        <h1>{data.businessName}</h1>
        <p className="muted">
          Staff can manage listings and reply to customers. Business settings remain under
          your control.
        </p>
      </header>

      <section className={styles.compose}>
        <span className={styles.emblem}>
          <MailPlus size={24} aria-hidden="true" />
        </span>
        <div>
          <h2>Invite a staff member</h2>
          <p className="muted">
            They can accept in My shops using their verified email. Invitations expire
            after seven days.
          </p>
        </div>

        <BusinessStaffForm
          fields={{
            kind: "invite",
            businessId: data.businessId,
          }}
          label="Invite staff member"
          variant="primary"
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium">Email address</span>

            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="person@example.com"
              className={styles.input}
            />
          </label>
        </BusinessStaffForm>
        <p className={styles.accessNote}>
          <ShieldCheck size={16} aria-hidden="true" /> Staff can help with listings and
          messages. Only owners manage business settings.
        </p>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <h2>
            <Users size={18} aria-hidden="true" /> Team members
          </h2>
          <span className={styles.count}>{data.members.length}</span>
        </div>

        <div className="divide-y divide-stone-200">
          {data.members.map((member) => (
            <article key={member.userId} className={styles.row}>
              <span className={styles.avatar} aria-hidden="true">
                {member.name.trim().slice(0, 1).toUpperCase() || "S"}
              </span>
              <div className={styles.person}>
                <h3 className="font-medium">{member.name}</h3>
                <p className="muted text-sm">{member.email}</p>
                <p className={styles.badge}>
                  {member.role === "OWNER" ? "Owner" : "Staff"}
                </p>
              </div>

              {member.role === "STAFF" && (
                <BusinessStaffForm
                  fields={{
                    kind: "remove",
                    businessId: data.businessId,
                    userId: member.userId,
                  }}
                  label="Remove access"
                  confirmation={`Remove ${member.name}'s access to this business? Their personal account will remain available.`}
                />
              )}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeading}>
          <h2>
            <MailPlus size={18} aria-hidden="true" /> Invitations
          </h2>
          <span className={styles.count}>{data.invitations.length}</span>
        </div>

        {data.invitations.length === 0 ? (
          <div className={styles.empty}>
            <MailPlus size={25} aria-hidden="true" />
            <p>No invitations waiting</p>
            <span>Invite someone above to grow your team.</span>
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {data.invitations.map((invitation) => (
              <article key={invitation.id} className={styles.row}>
                <div>
                  <h3 className="font-medium">{invitation.email}</h3>
                  <p className="muted text-sm">
                    {invitation.expired
                      ? "Expired — cancel or invite this email again."
                      : "Awaiting acceptance"}
                  </p>
                </div>

                <BusinessStaffForm
                  fields={{
                    kind: "cancel",
                    businessId: data.businessId,
                    invitationId: invitation.id,
                  }}
                  label="Cancel invitation"
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
