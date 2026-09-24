import "server-only"

import { z } from "zod"


import type { Actor } from "@/lib/permissions"

import { recordAudit } from "@/repositories/audit";
import { withTransaction } from "@/repositories/transaction";
import * as repository from "@/repositories/business-staff";
import { sendBusinessStaffInvitationMail } from "@/lib/business-staff-mail";




type Tx = Parameters<
    Parameters<typeof withTransaction>[0]
>[0];

const id = z.string().trim().min(1).max(100);

const commandInput = z.discriminatedUnion("kind", [
    z.object({
        kind: z.literal("invite"),
        businessId: id,
        email: z.email().max(254).transform((value) => value.toLowerCase()),
    }),
    z.object({
        kind: z.literal("cancel"),
        businessId: id,
        invitationId: id,
    }),
    z.object({
        kind: z.literal("remove"),
        businessId: id,
        userId: id,
    }),
    z.object({
        kind: z.literal("accept"),
        businessId: id,
        invitationId: id,
    }),
    z.object({
        kind: z.literal("decline"),
        businessId: id,
        invitationId: id,
    }),
]);

export class BusinessStaffError extends Error { }

async function activeUser(tx: Tx, actor: Actor) {
    const user = await repository.lockStaffActor(tx, actor.id);

    if (!user || user.suspendedAt || !user.emailVerified) {
        throw new BusinessStaffError(
            "An active account with a verified email is required.",
        );
    }

    return user;
}

async function activeBusiness(tx: Tx, businessId: string) {
    const business = await repository.lockStaffBusiness(tx, businessId);

    if (!business || business.suspendedAt) {
        throw new BusinessStaffError("This business is unavailable.");
    }

    return business;
}


async function requireOwner(tx: Tx, businessId: string, userId: string,
) {
    const membership = await repository.findStaffMembership(
        tx,
        businessId,
        userId,
    );

    if (membership?.role !== "OWNER") {
        throw new BusinessStaffError(
            "Only the business owner can manage staff.",
        );
    }
}



export async function getBusinessStaff(actor: Actor, rawBusinessId: string,
) {
    const businessId = id.parse(rawBusinessId);

    return withTransaction(async (tx) => {
        const user = await activeUser(tx, actor);
        const business = await activeBusiness(tx, businessId);

        await requireOwner(tx, businessId, user.id);

        const members = await repository.listStaffMembers(tx, businessId);
        const invitations = await repository.listBusinessStaffInvitations(
            tx,
            businessId,
        );

        return {
            businessId,
            businessName: business.publicName,
            members: members.map((member) => ({
                userId: member.userId,
                name: member.user.name,
                email: member.user.email,
                role: member.role,
            })),
            invitations: invitations.map((invitation) => ({
                id: invitation.id,
                email: invitation.email,
                expired: invitation.expiresAt <= new Date(),
            })),
        };
    });
}


export async function getMyStaffInvitations(actor: Actor) {
    return withTransaction(async (tx) => {
        const user = await activeUser(tx, actor);

        const invitations = await repository.listMyStaffInvitations(
            tx,
            user.email.toLowerCase(),
        );

        return invitations.map((invitation) => ({
            id: invitation.id,
            businessId: invitation.businessId,
            businessName: invitation.business.publicName,
        }));
    });
}







export async function changeBusinessStaff(actor: Actor, raw: unknown) {
    const command = commandInput.parse(raw);

    const businessId = await withTransaction(async (tx) => {
        const user = await activeUser(tx, actor);
        const business = await activeBusiness(tx, command.businessId);

        if (
            command.kind === "accept" ||
            command.kind === "decline"
        ) {
            const invitation = await repository.findStaffInvitation(
                tx,
                business.id,
                command.invitationId,
            );

            if (
                !invitation ||
                invitation.email !== user.email.toLowerCase() ||
                invitation.expiresAt <= new Date()
            ) {
                throw new BusinessStaffError(
                    "This invitation is unavailable or belongs to another email.",
                );
            }

            if (command.kind === "accept") {
                const existing = await repository.findStaffMembership(
                    tx,
                    business.id,
                    user.id,
                );

                // Never downgrade an existing owner or replace a membership.
                if (!existing) {
                    await repository.addStaffMembership(tx, business.id, user.id);
                }
            }

            await repository.deleteStaffInvitation(tx, invitation.id);

            await recordAudit(
                tx,
                user.id,
                `business.staff.${command.kind === "accept" ? "accepted" : "declined"}`,
                business.id,
                { invitationId: invitation.id },
            );

            return business.id;
        }

        await requireOwner(tx, business.id, user.id);

        if (command.kind === "invite") {
            if (command.email === user.email.toLowerCase()) {
                throw new BusinessStaffError("You already own this business.");
            }

            const existingMember = await repository.findStaffMemberByEmail(
                tx,
                business.id,
                command.email,
            );

            if (existingMember) {
                throw new BusinessStaffError(
                    "That person already belongs to this business.",
                );
            }

            await repository.removeExpiredStaffInvitations(tx, business.id);

            const existingInvitation =
                await repository.findStaffInvitationByEmail(
                    tx,
                    business.id,
                    command.email,
                );

            if (existingInvitation) {
                throw new BusinessStaffError(
                    "An invitation for this email is already pending.",
                );
            }

            // A pending-invitation cap, not a paid staff-seat limit.
            const pending = await repository.countPendingStaffInvitations(
                tx,
                business.id,
            );

            if (pending >= 50) {
                throw new BusinessStaffError(
                    "Cancel some pending invitations before adding more.",
                );
            }

            const invitation = await repository.createStaffInvitation(tx, {
                businessId: business.id,
                email: command.email,
                invitedById: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });

            await recordAudit(
                tx,
                user.id,
                "business.staff.invited",
                business.id,
                { invitationId: invitation.id },
            );
        }

        if (command.kind === "cancel") {
            const invitation = await repository.findStaffInvitation(
                tx,
                business.id,
                command.invitationId,
            );

            if (!invitation) {
                throw new BusinessStaffError("Invitation not found.");
            }

            await repository.deleteStaffInvitation(tx, invitation.id);

            await recordAudit(
                tx,
                user.id,
                "business.staff.invitation_cancelled",
                business.id,
                { invitationId: invitation.id },
            );
        }

        if (command.kind === "remove") {
            const removed = await repository.removeStaffMembership(
                tx,
                business.id,
                command.userId,
            );

            if (removed.count !== 1) {
                throw new BusinessStaffError(
                    "Staff member not found. Owners cannot be removed here.",
                );
            }

            await recordAudit(
                tx,
                user.id,
                "business.staff.removed",
                business.id,
                { userId: command.userId },
            );
        }

        return business.id;
    });
    let warning = "";

    if (command.kind === "invite") {
        try {
            await sendBusinessStaffInvitationMail(command.email);
        } catch {
            console.error("Staff invitation email delivery failed.");

            warning =
                "Invitation saved, but email delivery could not be confirmed. " +
                "The recipient can still accept it from Dashboard → My shops.";
        }
    }

    return { businessId, warning };
}
