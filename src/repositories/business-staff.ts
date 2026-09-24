import "server-only";

import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;


export async function lockStaffActor(tx: Tx, userId: string) {
    await tx.$queryRaw`
    SELECT "id"
    FROM "User"
    WHERE "id" = ${userId}
    FOR SHARE
  `;
    return tx.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            emailVerified: true,
            suspendedAt: true,
        },
    });
}



export async function lockStaffBusiness(tx: Tx, businessId: string) {
    await tx.$queryRaw`
    SELECT "id"
    FROM "Business"
    WHERE "id" = ${businessId}
    FOR SHARE
  `;
    return tx.business.findUnique({
        where: { id: businessId },
        select: {
            id: true,
            publicName: true,
            suspendedAt: true,
        },
    });
}


export function findStaffMembership(tx: Tx, businessId: string, userId: string) {
    return tx.businessMembership.findUnique({
        where: {
            userId_businessId: { userId, businessId },
        },
    });
}

export function findStaffMemberByEmail(tx: Tx, businessId: string, email: string,) {
    return tx.businessMembership.findFirst({
        where: {
            businessId,
            user: {
                email: { equals: email, mode: "insensitive" },
            },
        },
        select: { userId: true },
    });
}

export function listStaffMembers(tx: Tx, businessId: string) {
    return tx.businessMembership.findMany({
        where: { businessId },
        orderBy: { user: { name: "asc" } },
        select: {
            userId: true,
            role: true,
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });
}

export function listBusinessStaffInvitations(
    tx: Tx,
    businessId: string,
) {
    return tx.businessStaffInvitation.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            email: true,
            expiresAt: true,
        },
    });
}

export function countPendingStaffInvitations(tx: Tx, businessId: string) {
    return tx.businessStaffInvitation.count({
        where: {
            businessId,
            expiresAt: { gt: new Date() },
        },
    });
}

export function removeExpiredStaffInvitations(tx: Tx, businessId: string) {
    return tx.businessStaffInvitation.deleteMany({
        where: {
            businessId,
            expiresAt: { lte: new Date() },
        },
    });
}

export function findStaffInvitationByEmail(tx: Tx, businessId: string, email: string,) {
    return tx.businessStaffInvitation.findUnique({
        where: {
            businessId_email: { businessId, email },
        },
    });
}

export function findStaffInvitation(tx: Tx, businessId: string, invitationId: string,
) {
    return tx.businessStaffInvitation.findFirst({
        where: {
            id: invitationId,
            businessId,
        },
    });
}


export function createStaffInvitation(tx: Tx, data: { businessId: string; email: string; invitedById: string; expiresAt: Date; },) {
    return tx.businessStaffInvitation.create({ data });
}

export function deleteStaffInvitation(tx: Tx, id: string) {
    return tx.businessStaffInvitation.delete({
        where: { id },
    });
}

export function addStaffMembership(tx: Tx, businessId: string, userId: string,) {
    return tx.businessMembership.create({
        data: {
            businessId,
            userId,
            role: "STAFF",
        },
    });
}

export function removeStaffMembership(tx: Tx, businessId: string, userId: string,) {
    return tx.businessMembership.deleteMany({
        where: {
            businessId,
            userId,
            role: "STAFF",
        },
    });
}


export function listMyStaffInvitations(tx: Tx, email: string) {
    return tx.businessStaffInvitation.findMany({
        where: {
            email,
            expiresAt: { gt: new Date() },
            business: {
                suspendedAt: null,
            },
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            businessId: true,
            business: {
                select: { publicName: true },
            },
        },
    });
}
