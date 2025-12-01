// src/app/api/returns/route.ts
// Returns list and create - GET (list), POST (create)
// Implements code_retour reuse when returns are deleted

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  formatReturnCode,
  getReturnStatus,
  canUserPerformAction,
  type Reporter,
  type Cause,
  type UserRole,
} from "@/types/returns";
import type { ReturnRow } from "@/types/returns";
import { Prisma } from "@prisma/client";

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
    const cause = searchParams.get("cause");
    const reporter = searchParams.get("reporter");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status");
    const history = searchParams.get("history") === "true";
    const take = parseInt(searchParams.get("take") || "100", 10);

    const userRole = (session.user as { role?: string }).role as UserRole;
    const userName = session.user.name || "";

    // Build where conditions
    const where: Prisma.ReturnWhereInput = {};
    const AND: Prisma.ReturnWhereInput[] = [];

    // Expert filter - only see their own returns
    if (userRole === "Expert") {
      AND.push({ expert: { contains: userName, mode: "insensitive" } });
    }

    // Vérificateur sees only returns awaiting physical verification OR verified (for review)
    if (userRole === "Verificateur") {
      AND.push({
        OR: [
          // Awaiting verification
          { returnPhysical: true, isVerified: false, isDraft: false, isFinal: false },
          // Already verified (can review)
          { isVerified: true },
        ],
      });
    }

    // Search filter
    if (q) {
      AND.push({
        OR: [
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
      AND.push({ cause: cause as Cause });
    }

    // Reporter filter
    if (reporter && reporter !== "all") {
      AND.push({ reporter: reporter as Reporter });
    }

    // Date range filter
    if (dateFrom) {
      AND.push({ reportedAt: { gte: new Date(dateFrom) } });
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      AND.push({ reportedAt: { lte: endDate } });
    }

    // Status filter
    if (status === "draft") {
      AND.push({ isDraft: true, isFinal: false });
    } else if (status === "confirmed") {
      AND.push({ isDraft: false, isVerified: false, isFinal: false });
    } else if (status === "awaiting_physical") {
      AND.push({ returnPhysical: true, isVerified: false, isDraft: false, isFinal: false });
    } else if (status === "verified") {
      AND.push({ isVerified: true, isFinal: false });
    } else if (status === "finalized") {
      AND.push({ isFinal: true, isStandby: false });
    } else if (status === "standby") {
      AND.push({ isStandby: true });
    }

    // History filter - show finalized, otherwise show active
    if (!history) {
      AND.push({ OR: [{ isFinal: false }, { isStandby: true }] });
    }

    if (AND.length > 0) {
      where.AND = AND;
    }

    const returns = await prisma.return.findMany({
      where,
      include: {
        products: { orderBy: { id: "asc" } },
        attachments: { orderBy: { uploadedAt: "desc" } },
      },
      orderBy: { reportedAt: "desc" },
      take,
    });

    // Map to response format
    const data: ReturnRow[] = returns.map((ret) => ({
      id: formatReturnCode(ret.id),
      codeRetour: ret.id,
      reportedAt: ret.reportedAt.toISOString(),
      reporter: ret.reporter as Reporter,
      cause: ret.cause as Cause,
      expert: ret.expert,
      client: ret.client,
      noClient: ret.noClient,
      noCommande: ret.noCommande,
      tracking: ret.noTracking,
      status: getReturnStatus(ret),
      standby: ret.isStandby,
      returnPhysical: ret.returnPhysical,
      isVerified: ret.isVerified,
      isFinal: ret.isFinal,
      amount: ret.amount ? Number(ret.amount) : null,
      dateCommande: ret.dateCommande,
      transport: ret.transporteur,
      description: ret.description,
      isPickup: ret.isPickup,
      isCommande: ret.isCommande,
      isReclamation: ret.isReclamation,
      noBill: ret.noBill,
      noBonCommande: ret.noBonCommande,
      noReclamation: ret.noReclamation,
      warehouseOrigin: ret.warehouseOrigin,
      warehouseDestination: ret.warehouseDestination,
      noCredit: ret.noCredit,
      noCredit2: ret.noCredit2,
      noCredit3: ret.noCredit3,
      creditedTo: ret.creditedTo,
      creditedTo2: ret.creditedTo2,
      creditedTo3: ret.creditedTo3,
      villeShipto: ret.villeShipto,
      totalWeight: ret.totalWeight ? Number(ret.totalWeight) : null,
      transportAmount: ret.transportAmount ? Number(ret.transportAmount) : null,
      restockingAmount: ret.restockingAmount ? Number(ret.restockingAmount) : null,
      products: ret.products.map((p) => ({
        id: String(p.id),
        codeProduit: p.codeProduit,
        descrProduit: p.descrProduit,
        descriptionRetour: p.descriptionRetour,
        quantite: p.quantite,
        quantiteRecue: p.quantiteRecue,
        qteInventaire: p.qteInventaire,
        qteDetruite: p.qteDetruite,
        tauxRestock: p.tauxRestock ? Number(p.tauxRestock) : null,
        weightProduit: p.weightProduit ? Number(p.weightProduit) : null,
        poids: p.poids ? Number(p.poids) : null,
      })),
      attachments: ret.attachments.map((a) => ({
        id: a.filePath,
        name: a.fileName,
        url: `https://drive.google.com/file/d/${a.filePath}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${a.filePath}`,
      })),
      createdBy: ret.initiatedBy
        ? { name: ret.initiatedBy, at: ret.initializedAt?.toISOString() || "" }
        : null,
      verifiedBy: ret.verifiedBy
        ? { name: ret.verifiedBy, at: ret.verifiedAt?.toISOString() || null }
        : null,
      finalizedBy: ret.finalizedBy
        ? { name: ret.finalizedBy, at: ret.finalizedAt?.toISOString() || null }
        : null,
    }));

    return NextResponse.json({ ok: true, data });
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
   
   IMPORTANT: Implements code_retour reuse logic
   When a return is deleted, its code becomes available again.
   We find the lowest available code instead of always using MAX + 1.
============================================================================= */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    // Role check - only Gestionnaire can create returns
    const userRole = (session.user as { role?: string }).role as UserRole;
    if (!canUserPerformAction(userRole, "create")) {
      return NextResponse.json(
        { ok: false, error: "Seul un gestionnaire peut créer un retour" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.reporter || !body.cause) {
      return NextResponse.json(
        { ok: false, error: "Reporter et cause sont requis" },
        { status: 400 }
      );
    }

    // Determine if this is a draft
    // A return is NOT a draft if it has all required fields AND at least one product with quantity > 0
    const hasRequiredFields =
      body.reporter && body.cause && (body.expert || body.client);
    const hasProducts =
      body.products &&
      body.products.length > 0 &&
      body.products.some((p: { quantite?: number }) => (p.quantite ?? 0) > 0);

    const isDraft = body.isDraft ?? !(hasRequiredFields && hasProducts);

    // =========================================================================
    // CODE REUSE LOGIC
    // Find the next available code_retour, reusing deleted codes
    // =========================================================================
    const nextCode = await findNextAvailableCode();

    // Create the return with the specific ID
    const ret = await prisma.return.create({
      data: {
        id: nextCode,
        reportedAt: body.reportedAt ? new Date(body.reportedAt) : new Date(),
        reporter: body.reporter || "expert",
        cause: body.cause || "production",
        expert: body.expert || null,
        client: body.client || null,
        noClient: body.noClient || null,
        noCommande: body.noCommande || null,
        noTracking: body.tracking || null,
        amount: body.amount ?? null,
        dateCommande: body.dateCommande || null,
        transporteur: body.transport || null,
        description: body.description || null,
        returnPhysical: body.returnPhysical ?? false,
        isPickup: body.isPickup ?? false,
        isCommande: body.isCommande ?? false,
        isReclamation: body.isReclamation ?? false,
        noBill: body.noBill || null,
        noBonCommande: body.noBonCommande || null,
        noReclamation: body.noReclamation || null,
        isDraft,
        isFinal: false,
        isVerified: false,
        isStandby: false,
        initiatedBy: session.user.name || "Système",
        initializedAt: new Date(),
      },
    });

    // Create products if provided
    if (body.products && Array.isArray(body.products) && body.products.length > 0) {
      await prisma.returnProduct.createMany({
        data: body.products.map(
          (p: {
            codeProduit: string;
            descriptionProduit?: string;
            descriptionRetour?: string;
            quantite?: number;
            weightProduit?: number;
          }) => ({
            returnId: ret.id,
            codeProduit: p.codeProduit,
            descrProduit: p.descriptionProduit || null,
            descriptionRetour: p.descriptionRetour || null,
            quantite: p.quantite || 0,
            weightProduit: p.weightProduit ?? null,
          })
        ),
      });
    }

    return NextResponse.json({
      ok: true,
      message: isDraft
        ? "Le brouillon a été créé avec succès."
        : `Le retour ${formatReturnCode(ret.id)} a été créé avec succès.`,
      data: {
        id: formatReturnCode(ret.id),
        codeRetour: ret.id,
        status: getReturnStatus(ret),
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
   Helper: Find next available code (reusing deleted codes)
   
   This function finds the lowest available ID that's not currently in use.
   If IDs 1,2,4,5 exist, it will return 3.
   If IDs 1,2,3 exist, it will return 4.
============================================================================= */

async function findNextAvailableCode(): Promise<number> {
  // Get all existing IDs in order
  const existingReturns = await prisma.return.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const existingIds = new Set(existingReturns.map((r) => r.id));

  // Find the first gap
  let nextCode = 1;
  while (existingIds.has(nextCode)) {
    nextCode++;
  }

  return nextCode;
}
