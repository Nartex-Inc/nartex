// src/app/api/returns/route.ts
// Returns API - GET (list with filters), POST (create new return)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import type {
  ReturnRow,
  CreateReturnPayload,
  AttachmentResponse,
  ProductLineResponse,
} from "@/types/returns";
import { getReturnStatus } from "@/types/returns";
import type { Return, ReturnProduct, Upload, Prisma } from "@prisma/client";

/* =============================================================================
   GET /api/returns - List returns with filters
============================================================================= */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const cause = searchParams.get("cause") || "";
    const reporter = searchParams.get("reporter") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const status = searchParams.get("status") || "";
    const take = parseInt(searchParams.get("take") || "200");
    const includeHistory = searchParams.get("history") === "true";

    // Build WHERE conditions
    const where: Prisma.ReturnWhereInput = {};
    const AND: Prisma.ReturnWhereInput[] = [];

    // Filter by final status (history vs active)
    if (includeHistory) {
      AND.push({ isFinal: true });
    } else {
      AND.push({ isFinal: false });
    }

    // Expert role filter - only show their own returns
    const userRole = (session.user as { role?: string }).role;
    const userName = session.user.name || "";
    if (userRole === "Expert") {
      AND.push({ expert: { contains: userName, mode: "insensitive" } });
    }

    // Search query
    if (q) {
      AND.push({
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { client: { contains: q, mode: "insensitive" } },
          { noCommande: { contains: q, mode: "insensitive" } },
          { noClient: { contains: q, mode: "insensitive" } },
          { expert: { contains: q, mode: "insensitive" } },
          { products: { some: { codeProduit: { contains: q, mode: "insensitive" } } } },
        ],
      });
    }

    // Cause filter
    if (cause && cause !== "all") {
      AND.push({ cause: cause as any });
    }

    // Reporter filter
    if (reporter && reporter !== "all") {
      AND.push({ reporter: reporter as any });
    }

    // Date range filter
    if (dateFrom) {
      AND.push({ reportedAt: { gte: new Date(dateFrom) } });
    }
    if (dateTo) {
      AND.push({ reportedAt: { lte: new Date(dateTo) } });
    }

    // Status filter
    if (status === "draft") {
      AND.push({ isDraft: true });
    } else if (status === "awaiting") {
      AND.push({ isDraft: false, retourPhysique: true, isVerified: false });
    } else if (status === "received") {
      AND.push({
        isDraft: false,
        OR: [{ retourPhysique: false }, { isVerified: true }],
      });
    }

    if (AND.length > 0) {
      where.AND = AND;
    }

    // Query with relations
    const returns = await prisma.return.findMany({
      where,
      include: {
        products: true,
        attachments: true,
      },
      orderBy: [{ reportedAt: "desc" }, { id: "desc" }],
      take,
    });

    // Map to response format
    const rows: ReturnRow[] = returns.map((r) => mapToReturnRow(r));

    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    console.error("GET /api/returns error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des retours" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   POST /api/returns - Create new return
============================================================================= */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const body: CreateReturnPayload = await request.json();

    // Validate required fields
    if (!body.expert?.trim() || !body.client?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Expert et client sont requis" },
        { status: 400 }
      );
    }

    // Determine if draft based on required fields
    const hasRequiredFields =
      body.reporter &&
      body.cause &&
      body.products &&
      body.products.length > 0 &&
      body.products.every((p) => p.codeProduit && p.quantite > 0);

    const isDraft = !hasRequiredFields;

    // Create return with products
    const created = await prisma.return.create({
      data: {
        code: "", // Will be updated after creation
        reporter: body.reporter || "expert",
        cause: body.cause || "production",
        expert: body.expert.trim(),
        client: body.client.trim(),
        noClient: body.noClient?.trim() || null,
        noCommande: body.noCommande?.trim() || null,
        tracking: body.tracking?.trim() || null,
        amount: body.amount ?? null,
        dateCommande: body.dateCommande ? new Date(body.dateCommande) : null,
        transport: body.transport?.trim() || null,
        description: body.description?.trim() || null,
        retourPhysique: body.retourPhysique || false,
        isDraft,
        isPickup: body.isPickup || false,
        isCommande: body.isCommande || false,
        isReclamation: body.isReclamation || false,
        noBill: body.noBill?.trim() || null,
        noBonCommande: body.noBonCommande?.trim() || null,
        noReclamation: body.noReclamation?.trim() || null,
        initiePar: session.user.name || "Système",
        dateInitialization: new Date(),
        status: isDraft ? "draft" : "received_or_no_physical",
        products: body.products
          ? {
              create: body.products.map((p) => ({
                codeProduit: p.codeProduit.trim(),
                descriptionProduit: p.descriptionProduit?.trim() || "",
                descriptionRetour: p.descriptionRetour?.trim() || null,
                quantite: p.quantite,
              })),
            }
          : undefined,
      },
    });

    // Update code with R + id format
    const updated = await prisma.return.update({
      where: { id: created.id },
      data: { code: `R${created.id}` },
    });

    return NextResponse.json({
      ok: true,
      return: {
        id: updated.code,
        code_retour: updated.id,
      },
    });
  } catch (error) {
    console.error("POST /api/returns error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la création du retour" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   Helper: Map Prisma Return to API ReturnRow
============================================================================= */

type ReturnWithRelations = Return & {
  products: ReturnProduct[];
  attachments: Upload[];
};

function mapToReturnRow(r: ReturnWithRelations): ReturnRow {
  const status = getReturnStatus(r);

  return {
    id: r.code,
    codeRetour: r.id,
    reportedAt: r.reportedAt.toISOString(),
    reporter: r.reporter,
    cause: r.cause,
    expert: r.expert,
    client: r.client,
    noClient: r.noClient,
    noCommande: r.noCommande,
    tracking: r.tracking,
    status,
    standby: r.isStandby,
    amount: r.amount ? Number(r.amount) : null,
    dateCommande: r.dateCommande?.toISOString() || null,
    transport: r.transport,
    description: r.description,
    attachments: r.attachments.map(
      (a): AttachmentResponse => ({
        id: a.url,
        name: a.name,
        url: `https://drive.google.com/file/d/${a.url}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${a.url}`,
      })
    ),
    products: r.products.map(
      (p): ProductLineResponse => ({
        id: String(p.id),
        codeProduit: p.codeProduit,
        descriptionProduit: p.descriptionProduit,
        descriptionRetour: p.descriptionRetour,
        quantite: p.quantite,
        poidsUnitaire: p.weightProduit ? Number(p.weightProduit) : null,
        poidsTotal: p.poids ? Number(p.poids) : null,
        quantiteRecue: p.quantiteRecue,
        qteInventaire: p.qteInventaire,
        qteDetruite: p.qteDetruite,
        tauxRestock: p.tauxRestock ? Number(p.tauxRestock) : null,
      })
    ),
    createdBy: r.initiePar
      ? {
          name: r.initiePar,
          avatar: null,
          at: r.dateInitialization?.toISOString() || r.createdAt.toISOString(),
        }
      : null,
    retourPhysique: r.retourPhysique,
    isPickup: r.isPickup,
    isCommande: r.isCommande,
    isReclamation: r.isReclamation,
    noBill: r.noBill,
    noBonCommande: r.noBonCommande,
    noReclamation: r.noReclamation,
    verifiedBy: r.verifiePar
      ? { name: r.verifiePar, at: r.dateVerification?.toISOString() || null }
      : null,
    finalizedBy: r.finalisePar
      ? { name: r.finalisePar, at: r.dateFinalisation?.toISOString() || null }
      : null,
    entrepotDepart: r.entrepotDepart,
    entrepotDestination: r.entrepotDestination,
    noCredit: r.noCredit,
    noCredit2: r.noCredit2,
    noCredit3: r.noCredit3,
    crediteA: r.crediteA,
    crediteA2: r.crediteA2,
    crediteA3: r.crediteA3,
    villeShipto: r.villeShipto,
    poidsTotal: r.poidsTotal ? Number(r.poidsTotal) : null,
    montantTransport: r.montantTransport ? Number(r.montantTransport) : null,
    montantRestocking: r.montantRestocking ? Number(r.montantRestocking) : null,
  };
}
