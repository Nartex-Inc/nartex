// src/app/api/support/tickets/[id]/route.ts
// Get single ticket, update ticket status

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendTicketUpdateEmail } from "@/lib/email";
import { TICKET_STATUSES } from "@/lib/support-constants";
import { notifyTicketStatusChange } from "@/lib/notifications";
import { getViewUrl, getPreviewUrl, getDownloadUrl, getThumbnailUrl } from "@/lib/google-drive";

// =============================================================================
// GET - Get single ticket by ID
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

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        attachments: true,
        comments: {
          orderBy: { createdAt: "desc" },
          include: { attachments: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Billet introuvable" }, { status: 404 });
    }

    const mapAttachment = (a: typeof ticket.attachments[0]) => ({
      id: a.id,
      ticketId: a.ticketId,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      commentId: a.commentId,
      uploadedAt: a.uploadedAt.toISOString(),
      viewUrl: getViewUrl(a.fileUrl),
      previewUrl: getPreviewUrl(a.fileUrl),
      downloadUrl: getDownloadUrl(a.fileUrl),
      thumbnailUrl: getThumbnailUrl(a.fileUrl),
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: ticket.id,
        code: ticket.code,
        userId: ticket.userId,
        userName: ticket.userName,
        userEmail: ticket.userEmail,
        userPhone: ticket.userPhone,
        tenantName: ticket.tenantName,
        site: ticket.site,
        departement: ticket.departement,
        categorie: ticket.categorie,
        sousCategorie: ticket.sousCategorie,
        impact: ticket.impact,
        portee: ticket.portee,
        urgence: ticket.urgence,
        priorite: ticket.priorite,
        sujet: ticket.sujet,
        description: ticket.description,
        statut: ticket.statut,
        assigneA: ticket.assigneA,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        resolvedAt: ticket.resolvedAt?.toISOString() || null,
        closedAt: ticket.closedAt?.toISOString() || null,
        slaTarget: ticket.slaTarget?.toISOString() || null,
        attachments: ticket.attachments.map(mapAttachment),
        comments: ticket.comments.map((c) => ({
          id: c.id,
          userId: c.userId,
          userName: c.userName,
          content: c.content,
          isInternal: c.isInternal,
          createdAt: c.createdAt.toISOString(),
          attachments: c.attachments.map(mapAttachment),
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/support/tickets/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement du billet" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete a ticket (Gestionnaire only)
// =============================================================================

export async function DELETE(
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

    // Only Gestionnaire can delete tickets
    const userRole = (session.user as any).role;
    const userEmail = session.user.email;
    const isGestionnaire = userRole === "Gestionnaire" || userEmail === "n.labranche@sinto.ca";

    if (!isGestionnaire) {
      return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
    }

    // Verify ticket exists and belongs to tenant
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, tenantId },
    });

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Billet introuvable" }, { status: 404 });
    }

    await prisma.supportTicket.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/support/tickets/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la suppression du billet" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH - Update ticket (status, assignee, etc.)
// =============================================================================

interface UpdateTicketPayload {
  statut?: string;
  assigneA?: string | null;
}

export async function PATCH(
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

    // Check ticket exists and belongs to tenant
    const existingTicket = await prisma.supportTicket.findFirst({
      where: { id, tenantId },
      include: { tenant: { select: { logo: true } } },
    });

    if (!existingTicket) {
      return NextResponse.json({ ok: false, error: "Billet introuvable" }, { status: 404 });
    }

    const body = await request.json() as UpdateTicketPayload;
    const updateData: Record<string, unknown> = {};
    let statusChanged = false;
    let newStatusLabel: string | undefined;

    // Handle status update
    if (body.statut && body.statut !== existingTicket.statut) {
      const validStatuses = ["nouveau", "en_cours", "en_attente", "resolu", "ferme"];
      if (!validStatuses.includes(body.statut)) {
        return NextResponse.json({ ok: false, error: "Statut invalide" }, { status: 400 });
      }
      updateData.statut = body.statut;
      statusChanged = true;
      newStatusLabel = TICKET_STATUSES.find((s) => s.value === body.statut)?.label || body.statut;

      // Set resolved/closed timestamps
      if (body.statut === "resolu" && !existingTicket.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
      if (body.statut === "ferme" && !existingTicket.closedAt) {
        updateData.closedAt = new Date();
      }
    }

    // Handle assignee update
    if (body.assigneA !== undefined) {
      updateData.assigneA = body.assigneA;
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: updateData,
    });

    // Send notification email if status changed
    if (statusChanged) {
      sendTicketUpdateEmail({
        ticketCode: existingTicket.code,
        ticketId: existingTicket.id,
        sujet: existingTicket.sujet,
        userName: existingTicket.userName,
        userEmail: existingTicket.userEmail,
        tenantName: existingTicket.tenantName,
        tenantLogo: existingTicket.tenant?.logo,
        updateType: 'status_change',
        newStatus: body.statut,
        statusLabel: newStatusLabel,
      }).catch((err) => console.error("Failed to send status update email:", err));

      // In-app notification to demandeur
      if (existingTicket.userId !== session.user.id) {
        notifyTicketStatusChange({
          ticketId: existingTicket.id,
          ticketCode: existingTicket.code,
          sujet: existingTicket.sujet,
          demandeurUserId: existingTicket.userId,
          updatedBy: session.user.name || session.user.email || "Équipe TI",
          newStatusLabel: newStatusLabel!,
          tenantId,
        }).catch((err) => console.error("Failed to send status notification:", err));
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: updatedTicket.id,
        statut: updatedTicket.statut,
        assigneA: updatedTicket.assigneA,
        updatedAt: updatedTicket.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("PATCH /api/support/tickets/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la mise à jour du billet" },
      { status: 500 }
    );
  }
}
