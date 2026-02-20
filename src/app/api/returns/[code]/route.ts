// src/app/api/returns/[code]/route.ts
// Single return operations - GET (detail), PUT (update), DELETE (remove)

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseReturnCode, formatReturnCode, getReturnStatus } from "@/types/returns";
import type { ReturnRow } from "@/types/returns";
import { requireTenant, requireRoles, normalizeRole } from "@/lib/auth-helpers";
import { UpdateReturnSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ code: string }> };

/* =============================================================================
   GET /api/returns/[code] - Get single return detail
============================================================================= */

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    const { code } = await params;
    const returnId = parseReturnCode(code);

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findFirst({
      where: { id: returnId, tenantId },
      include: {
        products: { orderBy: { id: "asc" } },
        attachments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Expert can only see their own returns
    const userName = user.name || "";
    if (normalizeRole(user.role) === "expert" && ret.expert && !ret.expert.toLowerCase().includes(userName.toLowerCase())) {
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
        id: a.fileId,
        name: a.fileName,
        url: `https://drive.google.com/file/d/${a.fileId}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${a.fileId}`,
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
   Only Gestionnaire/Analyste can edit, and only during DRAFT or ACTIVE phases.
============================================================================= */

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    // Role guard: only Gestionnaire/Analyste can update via PUT
    const roleError = requireRoles(user, ["gestionnaire", "analyste"]);
    if (roleError) return roleError;

    const { code } = await params;
    const returnId = parseReturnCode(code);

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findFirst({
      where: { id: returnId, tenantId },
      include: { products: true },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Phase guard: cannot edit verified or finalized returns via PUT
    if (ret.isVerified) {
      return NextResponse.json(
        { ok: false, error: "Ce retour est vérifié. Utilisez les endpoints dédiés pour les modifications." },
        { status: 403 }
      );
    }
    if (ret.isFinal) {
      return NextResponse.json(
        { ok: false, error: "Ce retour est finalisé. Aucune modification permise." },
        { status: 403 }
      );
    }

    // Zod validation — strips unknown fields (including any status flags)
    const raw = await request.json();
    const parsed = UpdateReturnSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Determine phase: DRAFT vs ACTIVE
    const isDraftPhase = ret.isDraft;

    // Build update data conditionally based on phase
    // DRAFT: all fields editable
    // ACTIVE: locked fields = client, noClient, amount, transporteur. Products read-only.
    const updateData: Record<string, unknown> = {};

    // Always editable fields (both DRAFT and ACTIVE)
    if (body.reporter !== undefined) updateData.reporter = body.reporter;
    if (body.cause !== undefined) updateData.cause = body.cause;
    if (body.expert !== undefined) updateData.expert = body.expert;
    if (body.noCommande !== undefined) updateData.noCommande = body.noCommande;
    if (body.tracking !== undefined) updateData.noTracking = body.tracking;
    if (body.dateCommande !== undefined) updateData.dateCommande = body.dateCommande;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.physicalReturn !== undefined) updateData.returnPhysical = body.physicalReturn;
    if (body.isPickup !== undefined) updateData.isPickup = body.isPickup;
    if (body.isCommande !== undefined) updateData.isCommande = body.isCommande;
    if (body.isReclamation !== undefined) updateData.isReclamation = body.isReclamation;
    if (body.noBill !== undefined) updateData.noBill = body.noBill;
    if (body.noBonCommande !== undefined) updateData.noBonCommande = body.noBonCommande;
    if (body.noReclamation !== undefined) updateData.noReclamation = body.noReclamation;

    // Draft-only fields (locked once active)
    if (isDraftPhase) {
      if (body.client !== undefined) updateData.client = body.client;
      if (body.noClient !== undefined) updateData.noClient = body.noClient;
      if (body.amount !== undefined) updateData.amount = body.amount;
      if (body.transport !== undefined) updateData.transporteur = body.transport;
    }

    // Compute isDraft status
    const effectiveReporter = body.reporter ?? ret.reporter;
    const effectiveCause = body.cause ?? ret.cause;
    const effectiveExpert = body.expert ?? ret.expert;
    const effectiveClient = isDraftPhase ? (body.client ?? ret.client) : ret.client;
    const hasRequiredFields = effectiveReporter && effectiveCause && effectiveExpert && effectiveClient;

    // Check product count for draft calculation
    const incomingProductCount = body.products?.length;
    const existingProductCount = ret.products.length;
    const effectiveProductCount = incomingProductCount !== undefined ? incomingProductCount : existingProductCount;
    const hasProducts = effectiveProductCount > 0;

    updateData.isDraft = !(hasRequiredFields && hasProducts);

    // Update the return
    const updated = await prisma.return.update({
      where: { id: returnId },
      data: updateData,
    });

    // Product updates: only allowed in DRAFT phase
    if (isDraftPhase && body.products && Array.isArray(body.products)) {
      // Build a map of incoming products by codeProduit
      const incomingMap = new Map(
        body.products.map((p) => [p.codeProduit, p])
      );
      const existingMap = new Map(
        ret.products.map((p) => [p.codeProduit, p])
      );

      // Upsert: update existing, create new
      for (const [codeProduit, incoming] of incomingMap) {
        const existing = existingMap.get(codeProduit);
        if (existing) {
          // Update existing product — preserve verification data
          await prisma.returnProduct.update({
            where: { id: existing.id },
            data: {
              descrProduit: incoming.descriptionProduit || existing.descrProduit,
              descriptionRetour: incoming.descriptionRetour || existing.descriptionRetour,
              quantite: incoming.quantite ?? existing.quantite,
            },
          });
        } else {
          // Create new product
          await prisma.returnProduct.create({
            data: {
              returnId: ret.id,
              codeProduit: incoming.codeProduit,
              descrProduit: incoming.descriptionProduit || null,
              descriptionRetour: incoming.descriptionRetour || null,
              quantite: incoming.quantite || 0,
            },
          });
        }
      }

      // Delete products that were removed (not in incoming list)
      const incomingCodes = new Set(incomingMap.keys());
      const toDelete = ret.products.filter((p) => !incomingCodes.has(p.codeProduit));
      if (toDelete.length > 0) {
        await prisma.returnProduct.deleteMany({
          where: { id: { in: toDelete.map((p) => p.id) } },
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
   Only Gestionnaire can delete (and only if not verified/finalized).
============================================================================= */

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    // Only Gestionnaire can delete
    const roleError = requireRoles(user, ["gestionnaire"]);
    if (roleError) return roleError;

    const { code } = await params;
    const returnId = parseReturnCode(code);

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findFirst({
      where: { id: returnId, tenantId },
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
