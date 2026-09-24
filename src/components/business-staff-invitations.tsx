import { BusinessStaffForm } from "@/components/business-staff-form";
import { MailPlus, Store } from "lucide-react";
import styles from "./business-staff.module.css";

type Invitation = {
  id: string;
  businessId: string;
  businessName: string;
};

export function BusinessStaffInvitations({ invitations }: { invitations: Invitation[] }) {
  if (!invitations.length) {
    return null;
  }

  return (
    <section className="workspace-section">
      <div className="section-heading">
        <div>
          <h2>
            Business invitations{" "}
            <span className={styles.count}>{invitations.length}</span>
          </h2>
          <p>You have been invited to join these businesses as staff.</p>
        </div>
      </div>

      <div className="space-y-4">
        {invitations.map((invitation) => (
          <article key={invitation.id} className={styles.invitationCard}>
            <span className={styles.emblem}>
              <Store size={24} aria-hidden="true" />
            </span>
            <div className={styles.invitationBody}>
              <span className={styles.kicker}>
                <MailPlus size={13} aria-hidden="true" /> YOU’RE INVITED
              </span>
              <h3>{invitation.businessName}</h3>
              <p>Manage listings and respond to customer messages.</p>
              <span className={styles.badge}>Staff access</span>
            </div>

            <div className={styles.invitationActions}>
              <BusinessStaffForm
                fields={{
                  kind: "accept",
                  businessId: invitation.businessId,
                  invitationId: invitation.id,
                }}
                label="Accept invitation"
                variant="primary"
              />

              <BusinessStaffForm
                fields={{
                  kind: "decline",
                  businessId: invitation.businessId,
                  invitationId: invitation.id,
                }}
                label="Decline"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
