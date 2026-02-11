// src/lib/notifications.ts
// Server-side notification utilities

import prisma from "@/lib/prisma";

export interface CreateNotificationData {
  userId: string;
  tenantId?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(data: CreateNotificationData) {
  try {
    return await prisma.notification.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId || null,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

/**
 * Create notifications for all users with a specific role in a tenant
 */
export async function notifyTenantUsersByRole(
  tenantId: string,
  roles: string[],
  notificationData: Omit<CreateNotificationData, "userId" | "tenantId">,
  excludeUserId?: string
) {
  try {
    // Find all users in the tenant with the specified roles
    const userTenants = await prisma.userTenant.findMany({
      where: {
        tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    // Filter by role and create notifications
    const notifications = userTenants
      .filter((ut) => roles.includes(ut.user.role))
      .filter((ut) => !excludeUserId || ut.user.id !== excludeUserId)
      .map((ut) => ({
        userId: ut.user.id,
        tenantId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        link: notificationData.link || null,
        entityType: notificationData.entityType || null,
        entityId: notificationData.entityId || null,
      }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications,
      });
    }

    return notifications.length;
  } catch (error) {
    console.error("Failed to notify tenant users:", error);
    return 0;
  }
}

/**
 * Create a notification for a new support ticket
 */
export async function notifyNewSupportTicket(ticketData: {
  ticketId: string;
  ticketCode: string;
  sujet: string;
  priorite: string;
  tenantId: string;
  userName: string;
}) {
  // Notify all Gestionnaire users in the tenant
  return notifyTenantUsersByRole(
    ticketData.tenantId,
    ["Gestionnaire"],
    {
      type: "ticket_created",
      title: `Nouveau billet: ${ticketData.ticketCode}`,
      message: `${ticketData.userName} a créé un billet [${ticketData.priorite}]: ${ticketData.sujet}`,
      link: `/dashboard/support/tickets`,
      entityType: "support_ticket",
      entityId: ticketData.ticketId,
    }
  );
}

/**
 * Notify the demandeur when a Gestionnaire comments on their ticket
 */
export async function notifyTicketComment(data: {
  ticketId: string;
  ticketCode: string;
  sujet: string;
  demandeurUserId: string;
  commentAuthor: string;
  tenantId: string;
}) {
  return createNotification({
    userId: data.demandeurUserId,
    tenantId: data.tenantId,
    type: "ticket_comment",
    title: `Mise à jour: ${data.ticketCode}`,
    message: `${data.commentAuthor} a commenté votre billet "${data.sujet}" (${data.ticketCode})`,
    link: `/dashboard/support/tickets`,
    entityType: "support_ticket",
    entityId: data.ticketId,
  });
}

/**
 * Notify the demandeur when ticket status changes
 */
export async function notifyTicketStatusChange(data: {
  ticketId: string;
  ticketCode: string;
  sujet: string;
  demandeurUserId: string;
  updatedBy: string;
  newStatusLabel: string;
  tenantId: string;
}) {
  return createNotification({
    userId: data.demandeurUserId,
    tenantId: data.tenantId,
    type: "ticket_updated",
    title: `Statut modifié: ${data.ticketCode}`,
    message: `${data.updatedBy} a changé le statut de votre billet "${data.sujet}" (${data.ticketCode}) à "${data.newStatusLabel}"`,
    link: `/dashboard/support/tickets`,
    entityType: "support_ticket",
    entityId: data.ticketId,
  });
}

/**
 * Notify all Gestionnaires when a demandeur replies on a ticket
 */
export async function notifyTicketReply(data: {
  ticketId: string;
  ticketCode: string;
  sujet: string;
  replyUserName: string;
  replyUserId: string;
  tenantId: string;
}) {
  return notifyTenantUsersByRole(
    data.tenantId,
    ["Gestionnaire"],
    {
      type: "ticket_comment",
      title: `Réponse: ${data.ticketCode}`,
      message: `${data.replyUserName} a répondu sur le billet "${data.sujet}" (${data.ticketCode})`,
      link: `/dashboard/support/tickets`,
      entityType: "support_ticket",
      entityId: data.ticketId,
    },
    data.replyUserId
  );
}

// =============================================================================
// RETURNS NOTIFICATIONS
// =============================================================================

/**
 * Notify Vérificateur and Facturation when a new return is created
 */
export async function notifyReturnCreated(data: {
  returnId: number;
  returnCode: string;
  client: string;
  userName: string;
  tenantId: string;
}) {
  return notifyTenantUsersByRole(
    data.tenantId,
    ["Vérificateur", "Facturation"],
    {
      type: "return_created",
      title: `Nouveau retour: ${data.returnCode}`,
      message: `${data.userName} a créé un retour pour ${data.client}`,
      link: `/dashboard/returns`,
      entityType: "return",
      entityId: String(data.returnId),
    }
  );
}

/**
 * Notify Gestionnaire when a return is verified
 */
export async function notifyReturnVerified(data: {
  returnId: number;
  returnCode: string;
  verifiedBy: string;
  tenantId: string;
}) {
  return notifyTenantUsersByRole(
    data.tenantId,
    ["Gestionnaire"],
    {
      type: "return_verified",
      title: `Retour vérifié: ${data.returnCode}`,
      message: `${data.verifiedBy} a vérifié le retour ${data.returnCode}`,
      link: `/dashboard/returns`,
      entityType: "return",
      entityId: String(data.returnId),
    }
  );
}

/**
 * Notify Gestionnaire when a return is finalized
 */
export async function notifyReturnFinalized(data: {
  returnId: number;
  returnCode: string;
  finalizedBy: string;
  tenantId: string;
}) {
  return notifyTenantUsersByRole(
    data.tenantId,
    ["Gestionnaire"],
    {
      type: "return_finalized",
      title: `Retour finalisé: ${data.returnCode}`,
      message: `${data.finalizedBy} a finalisé le retour ${data.returnCode}`,
      link: `/dashboard/returns`,
      entityType: "return",
      entityId: String(data.returnId),
    }
  );
}

/**
 * Notify Gestionnaire when a return is put on standby
 */
export async function notifyReturnStandby(data: {
  returnId: number;
  returnCode: string;
  userName: string;
  tenantId: string;
}) {
  return notifyTenantUsersByRole(
    data.tenantId,
    ["Gestionnaire"],
    {
      type: "return_standby",
      title: `Retour en standby: ${data.returnCode}`,
      message: `${data.userName} a mis le retour ${data.returnCode} en standby`,
      link: `/dashboard/returns`,
      entityType: "return",
      entityId: String(data.returnId),
    }
  );
}
