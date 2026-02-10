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
  notificationData: Omit<CreateNotificationData, "userId" | "tenantId">
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
