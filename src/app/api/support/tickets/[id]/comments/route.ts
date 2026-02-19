// src/app/api/support/tickets/[id]/comments/route.ts
// Add comments to support tickets with optional attachments

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenant, canManageTickets } from "@/lib/auth-helpers";
import { sendTicketUpdateEmail } from "@/lib/email";
import { TICKET_STATUSES } from "@/lib/support-constants";
import { notifyTicketComment, notifyTicketStatusChange, notifyTicketReply } from "@/lib/notifications";

// =============================================================================
// GET - List comments for a ticket
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    const { id } = await params;

    // Verify ticket exists and belongs to tenant
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, tenantId },
      select: { id: true, userId: true },
    });

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Billet introuvable" }, { status: 404 });
    }

    // Non-Gestionnaire users can only view comments on their own tickets
    if (!canManageTickets(user) && ticket.userId !== user.id) {
      return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
    }

    const comments = await prisma.supportTicketComment.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      ok: true,
      data: comments.map((c) => ({
        id: c.id,
        userId: c.userId,
        userName: c.userName,
        content: c.content,
        isInternal: c.isInternal,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/support/tickets/[id]/comments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des commentaires" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Add a comment to a ticket
// =============================================================================

interface AddCommentPayload {
  content: string;
  isInternal?: boolean;
  newStatus?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    const { id } = await params;

    // Verify ticket exists and get details
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        code: true,
        sujet: true,
        userId: true,
        userEmail: true,
        userName: true,
        tenantName: true,
        statut: true,
        tenant: { select: { logo: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Billet introuvable" }, { status: 404 });
    }

    // Non-Gestionnaire users can only comment on their own tickets
    if (!canManageTickets(user) && ticket.userId !== user.id) {
      return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json() as AddCommentPayload;

    if (!body.content || body.content.trim().length < 1) {
      return NextResponse.json({ ok: false, error: "Le contenu est requis" }, { status: 400 });
    }

    // Check if user can add internal comments (requires canManageTickets permission)
    const canAddInternalComment = canManageTickets(user);
    const isInternal = canAddInternalComment && body.isInternal === true;

    // Create comment
    const comment = await prisma.supportTicketComment.create({
      data: {
        ticketId: id,
        userId: user.id,
        userName: user.name || user.email || "Utilisateur",
        content: body.content.trim(),
        isInternal,
      },
    });

    // Update ticket status if provided (only for Gestionnaire/admin)
    let statusUpdated = false;
    let newStatusLabel: string | undefined;

    if (body.newStatus && canAddInternalComment) {
      const validStatuses = ["nouveau", "en_cours", "en_attente", "resolu", "ferme"];
      if (validStatuses.includes(body.newStatus) && body.newStatus !== ticket.statut) {
        const updateData: Record<string, unknown> = { statut: body.newStatus };

        if (body.newStatus === "resolu") {
          updateData.resolvedAt = new Date();
        }
        if (body.newStatus === "ferme") {
          updateData.closedAt = new Date();
        }

        await prisma.supportTicket.update({
          where: { id },
          data: updateData,
        });

        statusUpdated = true;
        newStatusLabel = TICKET_STATUSES.find((s) => s.value === body.newStatus)?.label || body.newStatus;
      }
    }

    // Send email notification to requester (if not internal)
    // Always notify when Gestionnaire/admin replies (acting in support role)
    const isOwnTicket = ticket.userId === user.id;
    if (!isInternal && (!isOwnTicket || canAddInternalComment)) {
      sendTicketUpdateEmail({
        ticketCode: ticket.code,
        ticketId: ticket.id,
        sujet: ticket.sujet,
        userName: ticket.userName,
        userEmail: ticket.userEmail,
        tenantName: ticket.tenantName,
        tenantLogo: ticket.tenant?.logo,
        updateType: statusUpdated ? 'status_change' : 'comment',
        newStatus: statusUpdated ? body.newStatus : ticket.statut,
        statusLabel: statusUpdated ? newStatusLabel : undefined,
        commentContent: body.content.trim(),
        commentAuthor: user.name || "Équipe TI",
        hasAttachments: false,
      }).catch((err) => console.error("Failed to send update email:", err));
    }

    // In-app notifications
    const commentAuthorName = user.name || user.email || "Équipe TI";

    if (canAddInternalComment && !isInternal && ticket.userId !== user.id) {
      // Gestionnaire/admin commented on someone else's ticket → notify demandeur
      notifyTicketComment({
        ticketId: ticket.id,
        ticketCode: ticket.code,
        sujet: ticket.sujet,
        demandeurUserId: ticket.userId,
        commentAuthor: commentAuthorName,
        tenantId,
      }).catch((err) => console.error("Failed to send comment notification:", err));

      if (statusUpdated && newStatusLabel) {
        notifyTicketStatusChange({
          ticketId: ticket.id,
          ticketCode: ticket.code,
          sujet: ticket.sujet,
          demandeurUserId: ticket.userId,
          updatedBy: commentAuthorName,
          newStatusLabel,
          tenantId,
        }).catch((err) => console.error("Failed to send status notification:", err));
      }
    } else if (!canAddInternalComment) {
      // Regular user (demandeur) replied → notify all Gestionnaires
      notifyTicketReply({
        ticketId: ticket.id,
        ticketCode: ticket.code,
        sujet: ticket.sujet,
        replyUserName: commentAuthorName,
        replyUserId: user.id,
        tenantId,
      }).catch((err) => console.error("Failed to send reply notification:", err));
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: comment.id,
        userId: comment.userId,
        userName: comment.userName,
        content: comment.content,
        isInternal: comment.isInternal,
        createdAt: comment.createdAt.toISOString(),
        statusUpdated,
        newStatus: statusUpdated ? body.newStatus : undefined,
      },
    });
  } catch (error) {
    console.error("POST /api/support/tickets/[id]/comments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de l'ajout du commentaire" },
      { status: 500 }
    );
  }
}
