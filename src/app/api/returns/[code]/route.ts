// src/app/api/returns/[code]/route.ts
// Single return operations - GET (detail), PUT (update), DELETE (remove)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseReturnCode, formatReturnCode, getReturnStatus } from "@/types/returns";
import type { ReturnRow } from "@/types/returns";

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
    const returnId = parseReturnCode(code);

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findUnique({
      where: { id: returnId },
      include: {
        products: { orderBy: { id: "asc" } },
        // 👇 FIXED: Changed 'uploadedAt' to 'createdAt' to match Prisma Schema
        attachments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Expert can only see their own returns
    const userRole = (session.user as { role?: string }).role;
    const userName = session.user.name || "";
    if (userRole === "Expert" && ret.expert && !ret.expert.toLowerCase().includes(userName.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Accès non autorisé" }, { status: 403 });
    }

    // Map to response format
    const response: ReturnRow = {
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
      verified: ret.isVerified,
      finalized: ret.isFinal,
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
      createdBy: ret.initiatedBy
        ? { name: ret.initiatedBy, at: ret.initializedAt?.toISOString() || "" }
        : null,
      verifiedBy: ret.verifiedBy
        ? { name: ret.verifiedBy, at: ret.verifiedAt?.toISOString() || null }
        : null,
      finalizedBy: ret.finalizedBy
        ? { name: ret.finalizedBy, at: ret.finalizedAt?.toISOString() || null }
        : null,
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
        poidsUnitaire: p.weightProduit ? Number(p.weightProduit) : null,
        poidsTotal: p.poids ? Number(p.poids) : null,
      })),
      attachments: ret.attachments.map((a) => ({
        id: a.filePath,
        name: a.fileName,
        url: `https://drive.google.com/file/d/${a.filePath}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${a.filePath}`,
      })),
    };

    return NextResponse.json({ ok: true, data: response });
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

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findUnique({
      where: { id: returnId },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Check if return can be edited (except for verifying/finalizing which logic allows)
    // We allow edits if user is updating status flags specifically or if it's not final
    const body = await request.json();

    // Expert can only edit their own returns
    const userRole = (session.user as { role?: string }).role;
    const userName = session.user.name || "";
    if (userRole === "Expert" && ret.expert && !ret.expert.toLowerCase().includes(userName.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Accès non autorisé" }, { status: 403 });
    }

    // Determine if still a draft
    const hasRequiredFields =
      (body.reporter ?? ret.reporter) && 
      (body.cause ?? ret.cause) && 
      (body.expert ?? ret.expert) && 
      (body.client ?? ret.client);
    
    // For products, we need to check if we are updating them or if they exist
    const hasProducts = (body.products && body.products.length > 0) || (await prisma.returnProduct.count({ where: { returnId } })) > 0;
    
    const isDraft = body.isDraft ?? !(hasRequiredFields && hasProducts);

    // Update the return
    // Note: We handle new status flags (verified, finalized, physical)
    const updated = await prisma.return.update({
      where: { id: returnId },
      data: {
        reporter: body.reporter ?? ret.reporter,
        cause: body.cause ?? ret.cause,
        expert: body.expert ?? ret.expert,
        client: body.client ?? ret.client,
        noClient: body.noClient ?? ret.noClient,
        noCommande: body.noCommande ?? ret.noCommande,
        noTracking: body.tracking ?? ret.noTracking,
        amount: body.amount !== undefined ? body.amount : ret.amount,
        dateCommande: body.dateCommande ?? ret.dateCommande,
        transporteur: body.transport ?? ret.transporteur,
        description: body.description ?? ret.description,
        
        // Status Flags
        returnPhysical: body.physicalReturn ?? ret.returnPhysical,
        isVerified: body.verified ?? ret.isVerified,
        isFinal: body.finalized ?? ret.isFinal,
        
        isPickup: body.isPickup ?? ret.isPickup,
        isCommande: body.isCommande ?? ret.isCommande,
        isReclamation: body.isReclamation ?? ret.isReclamation,
        noBill: body.noBill ?? ret.noBill,
        noBonCommande: body.noBonCommande ?? ret.noBonCommande,
        noReclamation: body.noReclamation ?? ret.noReclamation,
        isDraft,
      },
    });

    // Update products if provided
    if (body.products && Array.isArray(body.products)) {
      // Delete existing products
      await prisma.returnProduct.deleteMany({ where: { returnId: ret.id } });

      // Create new products
      if (body.products.length > 0) {
        await prisma.returnProduct.createMany({
          data: body.products.map((p: { codeProduit: string; descriptionProduit?: string; descriptionRetour?: string; quantite: number }) => ({
            returnId: ret.id,
            codeProduit: p.codeProduit,
            descrProduit: p.descriptionProduit || null,
            descriptionRetour: p.descriptionRetour || null,
            quantite: p.quantite || 0,
          })),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      data: { id: formatReturnCode(updated.id), status: getReturnStatus(updated) },
    });
  } catch (error) {
    console.error("PUT /api/returns/[code] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la mise à jour du retour" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   DELETE /api/returns/[code] - Delete return
============================================================================= */

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    // Only Gestionnaire can delete
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "Gestionnaire") {
      return NextResponse.json(
        { ok: false, error: "Seul un gestionnaire peut supprimer un retour" },
        { status: 403 }
      );
    }

    const { code } = await params;
    const returnId = parseReturnCode(code);

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findUnique({
      where: { id: returnId },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Cannot delete verified or finalized returns
    if (ret.isVerified || ret.isFinal) {
      return NextResponse.json(
        { ok: false, error: "Impossible de supprimer un retour vérifié ou finalisé" },
        { status: 400 }
      );
    }

    // Delete (cascade will handle products and attachments)
    // Deleting this ID creates a "gap" that the POST logic in route.ts will automatically fill next time.
    await prisma.return.delete({ where: { id: returnId } });

    return NextResponse.json({ ok: true, message: "Retour supprimé" });
  } catch (error) {
    console.error("DELETE /api/returns/[code] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la suppression du retour" },
      { status: 500 }
    );
  }
}
