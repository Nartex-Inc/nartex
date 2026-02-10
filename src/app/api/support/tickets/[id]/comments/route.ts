// src/app/api/support/tickets/[id]/comments/route.ts
// Add comments to support tickets with optional attachments

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendTicketUpdateEmail } from "@/lib/email";
import { TICKET_STATUSES } from "@/lib/support-constants";

// =============================================================================
// GET - List comments for a ticket
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = session.user.activeTenantId;

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "Aucun tenant actif" }, { status: 400 });
    }

    // Verify ticket exists and belongs to tenant
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Billet introuvable" }, { status: 404 });
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = session.user.activeTenantId;
    const userRole = (session.user as any).role;

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "Aucun tenant actif" }, { status: 400 });
    }

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
        statut: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Billet introuvable" }, { status: 404 });
    }

    const body = await request.json() as AddCommentPayload;

    if (!body.content || body.content.trim().length < 1) {
      return NextResponse.json({ ok: false, error: "Le contenu est requis" }, { status: 400 });
    }

    // Check if user can add internal comments (only Gestionnaire or admin)
    const canAddInternalComment = userRole === "Gestionnaire" || userRole === "admin";
    const isInternal = canAddInternalComment && body.isInternal === true;

    // Create comment
    const comment = await prisma.supportTicketComment.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Utilisateur",
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

    // Send email notification to requester (if not internal and not self-comment)
    const isOwnTicket = ticket.userId === session.user.id;
    if (!isInternal && !isOwnTicket) {
      sendTicketUpdateEmail({
        ticketCode: ticket.code,
        ticketId: ticket.id,
        sujet: ticket.sujet,
        userName: ticket.userName,
        userEmail: ticket.userEmail,
        updateType: statusUpdated ? 'status_change' : 'comment',
        newStatus: statusUpdated ? body.newStatus : ticket.statut,
        statusLabel: statusUpdated ? newStatusLabel : undefined,
        commentContent: body.content.trim(),
        commentAuthor: session.user.name || "Équipe TI",
        hasAttachments: false,
      }).catch((err) => console.error("Failed to send update email:", err));
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
