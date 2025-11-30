// src/app/api/returns/[code]/route.ts
// Single return API - GET (detail), PUT (update), DELETE (remove)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import type { UpdateReturnPayload, ReturnRow, AttachmentResponse, ProductLineResponse } from "@/types/returns";
import { getReturnStatus, parseReturnCode } from "@/types/returns";
import type { Return, ReturnProduct, Upload } from "@prisma/client";

type RouteParams = { params: Promise<{ code: string }> };

/* =============================================================================
   GET /api/returns/[code] - Get single return detail
============================================================================= */

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { code } = await params;
    
    // Support both "R123" and "123" formats
    const returnId = parseReturnCode(code);
    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findFirst({
      where: { OR: [{ id: returnId }, { code: code.toUpperCase() }] },
      include: { products: true, attachments: true },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Expert role check
    const userRole = (session.user as { role?: string }).role;
    const userName = session.user.name || "";
    if (userRole === "Expert" && !ret.expert.toLowerCase().includes(userName.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Accès non autorisé" }, { status: 403 });
    }

    const returnRow = mapToReturnRow(ret);
    return NextResponse.json({ ok: true, return: returnRow });
  } catch (error) {
    console.error("GET /api/returns/[code] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement du retour" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   PUT /api/returns/[code] - Update return
============================================================================= */

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { code } = await params;
    const returnId = parseReturnCode(code);
    const body: UpdateReturnPayload = await request.json();

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const existing = await prisma.return.findFirst({
      where: { OR: [{ id: returnId }, { code: code.toUpperCase() }] },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    const userRole = (session.user as { role?: string }).role;

    // Check if return can be edited
    if (existing.isFinal && !existing.isStandby) {
      return NextResponse.json(
        { ok: false, error: "Ce retour est finalisé et ne peut plus être modifié" },
        { status: 400 }
      );
    }

    // Expert can only edit their own returns
    const userName = session.user.name || "";
    if (userRole === "Expert" && !existing.expert.toLowerCase().includes(userName.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Accès non autorisé" }, { status: 403 });
    }

    // Determine if still draft
    const hasRequiredFields =
      body.reporter &&
      body.cause &&
      body.expert?.trim() &&
      body.client?.trim() &&
      body.products &&
      body.products.length > 0 &&
      body.products.every((p) => p.codeProduit && p.quantite > 0);

    const isDraft = body.isDraft !== undefined ? body.isDraft : !hasRequiredFields;

    // Update return
    await prisma.return.update({
      where: { id: existing.id },
      data: {
        reporter: body.reporter ?? existing.reporter,
        cause: body.cause ?? existing.cause,
        expert: body.expert?.trim() ?? existing.expert,
        client: body.client?.trim() ?? existing.client,
        noClient: body.noClient?.trim() ?? existing.noClient,
        noCommande: body.noCommande?.trim() ?? existing.noCommande,
        tracking: body.tracking?.trim() ?? existing.tracking,
        amount: body.amount ?? existing.amount,
        dateCommande: body.dateCommande ? new Date(body.dateCommande) : existing.dateCommande,
        transport: body.transport?.trim() ?? existing.transport,
        description: body.description?.trim() ?? existing.description,
        retourPhysique: body.retourPhysique ?? existing.retourPhysique,
        isDraft,
        isPickup: body.isPickup ?? existing.isPickup,
        isCommande: body.isCommande ?? existing.isCommande,
        isReclamation: body.isReclamation ?? existing.isReclamation,
        noBill: body.noBill?.trim() ?? existing.noBill,
        noBonCommande: body.noBonCommande?.trim() ?? existing.noBonCommande,
        noReclamation: body.noReclamation?.trim() ?? existing.noReclamation,
        status: isDraft ? "draft" : (existing.retourPhysique && !existing.isVerified) ? "awaiting_physical" : "received_or_no_physical",
      },
    });

    // Update products if provided
    if (body.products) {
      // Delete existing and recreate
      await prisma.returnProduct.deleteMany({ where: { returnId: existing.id } });
      await prisma.returnProduct.createMany({
        data: body.products.map((p) => ({
          returnId: existing.id,
          codeProduit: p.codeProduit.trim(),
          descriptionProduit: p.descriptionProduit?.trim() || "",
          descriptionRetour: p.descriptionRetour?.trim() || null,
          quantite: p.quantite,
        })),
      });
    }

    return NextResponse.json({ ok: true, message: "Retour mis à jour" });
  } catch (error) {
    console.error("PUT /api/returns/[code] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la mise à jour du retour" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   DELETE /api/returns/[code] - Delete return (Gestionnaire only)
============================================================================= */

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "Gestionnaire") {
      return NextResponse.json(
        { ok: false, error: "Seul un Gestionnaire peut supprimer un retour" },
        { status: 403 }
      );
    }

    const { code } = await params;
    const returnId = parseReturnCode(code);

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const existing = await prisma.return.findFirst({
      where: { OR: [{ id: returnId }, { code: code.toUpperCase() }] },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    if (existing.isVerified || existing.isFinal) {
      return NextResponse.json(
        { ok: false, error: "Impossible de supprimer un retour vérifié ou finalisé" },
        { status: 400 }
      );
    }

    // Cascade delete handled by Prisma schema
    await prisma.return.delete({ where: { id: existing.id } });

    return NextResponse.json({ ok: true, message: "Retour supprimé" });
  } catch (error) {
    console.error("DELETE /api/returns/[code] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la suppression du retour" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   Helper
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
      ? { name: r.initiePar, avatar: null, at: r.dateInitialization?.toISOString() || r.createdAt.toISOString() }
      : null,
    retourPhysique: r.retourPhysique,
    isPickup: r.isPickup,
    isCommande: r.isCommande,
    isReclamation: r.isReclamation,
    noBill: r.noBill,
    noBonCommande: r.noBonCommande,
    noReclamation: r.noReclamation,
    verifiedBy: r.verifiePar ? { name: r.verifiePar, at: r.dateVerification?.toISOString() || null } : null,
    finalizedBy: r.finalisePar ? { name: r.finalisePar, at: r.dateFinalisation?.toISOString() || null } : null,
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
