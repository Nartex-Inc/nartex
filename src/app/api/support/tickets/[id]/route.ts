// src/app/api/support/tickets/[id]/route.ts
// Get single ticket, update ticket status

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Billet introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: ticket.id,
        code: ticket.code,
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
        attachments: ticket.attachments,
        comments: ticket.comments,
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
    });

    if (!existingTicket) {
      return NextResponse.json({ ok: false, error: "Billet introuvable" }, { status: 404 });
    }

    const body = await request.json() as UpdateTicketPayload;
    const updateData: Record<string, unknown> = {};

    // Handle status update
    if (body.statut) {
      const validStatuses = ["nouveau", "en_cours", "en_attente", "resolu", "ferme"];
      if (!validStatuses.includes(body.statut)) {
        return NextResponse.json({ ok: false, error: "Statut invalide" }, { status: 400 });
      }
      updateData.statut = body.statut;

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
