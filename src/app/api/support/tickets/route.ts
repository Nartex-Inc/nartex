// src/app/api/support/tickets/route.ts
// Support tickets API - Create and list tickets

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { calculatePriority, getEntiteForTenant, getPriorityInfo, SUPPORT_CATEGORIES, type CategoryKey } from "@/lib/support-constants";
import { sendTicketNotificationEmail, sendTicketConfirmationEmail } from "@/lib/email";
import { notifyNewSupportTicket } from "@/lib/notifications";

// =============================================================================
// GET - List support tickets
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const view = searchParams.get("view");
    const tenantId = session.user.activeTenantId;

    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "Aucun tenant actif" }, { status: 400 });
    }

    const userRole = (session.user as any).role;
    const userEmail = session.user.email;
    const isGestionnaire = userRole === "Gestionnaire" || userEmail === "n.labranche@sinto.ca";

    const whereClause: Record<string, unknown> = { tenantId };

    // Demandeur sees only their own tickets
    if (!isGestionnaire) {
      whereClause.userId = session.user.id;
    }

    // Filter by status or view mode
    if (status && status !== "all") {
      whereClause.statut = status;
    } else if (view === "history") {
      whereClause.statut = { in: ["resolu", "ferme"] };
    } else {
      whereClause.statut = { notIn: ["resolu", "ferme"] };
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        attachments: true,
        _count: {
          select: { comments: true },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: tickets.map((t) => ({
        id: t.id,
        code: t.code,
        sujet: t.sujet,
        categorie: t.categorie,
        sousCategorie: t.sousCategorie,
        priorite: t.priorite,
        statut: t.statut,
        userName: t.userName,
        userEmail: t.userEmail,
        site: t.site,
        departement: t.departement,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        attachmentsCount: t.attachments.length,
        commentsCount: t._count.comments,
      })),
    });
  } catch (error) {
    console.error("GET /api/support/tickets error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des billets" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create new support ticket
// =============================================================================

interface CreateTicketPayload {
  site: string;
  departement: string;
  categorie: string;
  sousCategorie?: string;
  impact: string;
  portee: string;
  urgence: string;
  sujet: string;
  description: string;
  userPhone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const tenantId = session.user.activeTenantId;
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "Problème de contexte Nartex - aucun tenant actif. Veuillez recharger la page." },
        { status: 400 }
      );
    }

    // Get tenant info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "Tenant introuvable" },
        { status: 400 }
      );
    }

    const body = await request.json() as CreateTicketPayload;

    // Validate required fields
    const requiredFields = ["site", "departement", "categorie", "impact", "portee", "urgence", "sujet", "description"];
    for (const field of requiredFields) {
      if (!body[field as keyof CreateTicketPayload]) {
        return NextResponse.json(
          { ok: false, error: `Le champ "${field}" est requis` },
          { status: 400 }
        );
      }
    }

    // Validate minimum lengths
    if (body.sujet.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Le sujet doit contenir au moins 10 caractères" },
        { status: 400 }
      );
    }

    if (body.description.length < 50) {
      return NextResponse.json(
        { ok: false, error: "La description doit contenir au moins 50 caractères" },
        { status: 400 }
      );
    }

    // Generate ticket code: TI-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `TI-${dateStr}-`;

    // Count existing tickets for today
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const todayCount = await prisma.supportTicket.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const sequenceNumber = (todayCount + 1).toString().padStart(4, "0");
    const ticketCode = `${prefix}${sequenceNumber}`;

    // Calculate priority
    const priorite = calculatePriority(body.impact, body.portee, body.urgence);
    const priorityInfo = getPriorityInfo(priorite);

    // Calculate SLA target
    const slaTarget = new Date(today.getTime() + priorityInfo.slaHours * 60 * 60 * 1000);

    // Get entité for Monday.com
    const entiteOperationnelle = getEntiteForTenant(tenant.slug);

    // Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        code: ticketCode,
        userId: session.user.id,
        userEmail: session.user.email || "",
        userName: session.user.name || "",
        userPhone: body.userPhone || null,
        tenantId: tenant.id,
        tenantName: tenant.name,
        entiteOperationnelle,
        site: body.site,
        departement: body.departement,
        categorie: body.categorie,
        sousCategorie: body.sousCategorie || null,
        impact: body.impact,
        portee: body.portee,
        urgence: body.urgence,
        priorite,
        slaTarget,
        sujet: body.sujet,
        description: body.description,
        statut: "nouveau",
      },
    });

    // Send email notification to IT team (fire and forget - don't block response)
    const categoryLabel = SUPPORT_CATEGORIES[body.categorie as CategoryKey]?.label || body.categorie;
    sendTicketNotificationEmail({
      ticketCode,
      sujet: body.sujet,
      description: body.description,
      userName: session.user.name || "",
      userEmail: session.user.email || "",
      tenantName: tenant.name,
      site: body.site,
      departement: body.departement,
      categorie: categoryLabel,
      priorite,
      prioriteLabel: priorityInfo.label,
      slaHours: priorityInfo.slaHours,
    }).catch((err) => console.error("Failed to send ticket notification:", err));

    // Create in-app notifications for IT team (fire and forget)
    notifyNewSupportTicket({
      ticketId: ticket.id,
      ticketCode,
      sujet: body.sujet,
      priorite,
      tenantId: tenant.id,
      userName: session.user.name || "",
    }).catch((err) => console.error("Failed to create in-app notification:", err));

    // Send confirmation email to the requester (fire and forget)
    sendTicketConfirmationEmail({
      ticketCode,
      sujet: body.sujet,
      description: body.description,
      userName: session.user.name || "",
      userEmail: session.user.email || "",
      priorite,
      prioriteLabel: priorityInfo.label,
      slaHours: priorityInfo.slaHours,
    }).catch((err) => console.error("Failed to send confirmation email:", err));

    return NextResponse.json({
      ok: true,
      data: {
        id: ticket.id,
        code: ticket.code,
        priorite: ticket.priorite,
        slaTarget: ticket.slaTarget?.toISOString(),
        createdAt: ticket.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/support/tickets error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la création du billet" },
      { status: 500 }
    );
  }
}
