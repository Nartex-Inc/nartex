// src/app/api/returns/route.ts
// Returns list and create - GET (list), POST (create)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { formatReturnCode, getReturnStatus } from "@/types/returns";
import type { ReturnRow, Reporter, Cause } from "@/types/returns";
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
    const take = parseInt(searchParams.get("take") || "50", 10);

    const userRole = (session.user as { role?: string }).role;
    const userName = session.user.name || "";

    // Build where conditions
    const where: Prisma.ReturnWhereInput = {};
    const AND: Prisma.ReturnWhereInput[] = [];

    // Expert filter - only see their own returns
    if (userRole === "Expert") {
      AND.push({ expert: { contains: userName, mode: "insensitive" } });
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
    if (cause) {
      AND.push({ cause: cause as Cause });
    }

    // Reporter filter
    if (reporter) {
      AND.push({ reporter: reporter as Reporter });
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
    } else if (status === "awaiting_physical") {
      AND.push({ returnPhysical: true, isVerified: false, isDraft: false, isFinal: false });
    } else if (status === "ready_for_finalization") {
      AND.push({
        isDraft: false,
        isFinal: false,
        OR: [
          { returnPhysical: false },
          { returnPhysical: true, isVerified: true },
        ],
      });
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
      reporter: ret.reporter,
      cause: ret.cause,
      expert: ret.expert,
      client: ret.client,
      noClient: ret.noClient,
      noCommande: ret.noCommande,
      tracking: ret.noTracking,
      status: getReturnStatus(ret),
      standby: ret.isStandby,
      amount: ret.amount ? Number(ret.amount) : null,
      dateCommande: ret.dateCommande,
      transport: ret.transporteur,
      description: ret.description,
      returnPhysical: ret.returnPhysical,
      products: ret.products.map((p) => ({
        id: String(p.id),
        codeProduit: p.codeProduit,
        descriptionProduit: p.descrProduit,
        descriptionRetour: p.descriptionRetour,
        quantite: p.quantite,
        quantiteRecue: p.quantiteRecue,
        qteInventaire: p.qteInventaire,
        qteDetruite: p.qteDetruite,
        tauxRestock: p.tauxRestock ? Number(p.tauxRestock) : null,
      })),
      attachments: ret.attachments.map((a) => ({
        id: a.filePath,
        name: a.fileName,
        url: `https://drive.google.com/file/d/${a.filePath}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${a.filePath}`,
      })),
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
============================================================================= */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.expert || !body.client) {
      return NextResponse.json(
        { ok: false, error: "Expert et client sont requis" },
        { status: 400 }
      );
    }

    // Determine if this is a draft
    const hasRequiredFields = body.reporter && body.cause && body.expert && body.client;
    const hasProducts = body.products && body.products.length > 0 && body.products.some((p: { quantite?: number }) => p.quantite > 0);
    const isDraft = !(hasRequiredFields && hasProducts);

    // Create the return
    const ret = await prisma.return.create({
      data: {
        reportedAt: new Date(),
        reporter: body.reporter || "expert",
        cause: body.cause || "production",
        expert: body.expert,
        client: body.client,
        noClient: body.noClient || null,
        noCommande: body.noCommande || null,
        noTracking: body.tracking || null,
        amount: body.amount || null,
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
        data: body.products.map((p: { codeProduit: string; descriptionProduit?: string; descriptionRetour?: string; quantite?: number }) => ({
          returnId: ret.id,
          codeProduit: p.codeProduit,
          descrProduit: p.descriptionProduit || null,
          descriptionRetour: p.descriptionRetour || null,
          quantite: p.quantite || 0,
        })),
      });
    }

    return NextResponse.json({
      ok: true,
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
