// src/app/api/returns/[code]/finalize/route.ts
// Finalize return - POST
// ONLY Facturation role can finalize returns

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseReturnCode, formatReturnCode } from "@/types/returns";
import { notifyReturnFinalized } from "@/lib/notifications";
import { requireTenant, requireRoles } from "@/lib/auth-helpers";
import { FinalizeReturnSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    // CRITICAL: Only Facturation can finalize returns
    const roleError = requireRoles(user, ["facturation"]);
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

    // Validation: If physical return, must be verified first
    if (ret.returnPhysical && !ret.isVerified) {
      return NextResponse.json(
        { ok: false, error: "Un retour physique doit être vérifié avant la finalisation" },
        { status: 400 }
      );
    }

    // Validation: Cannot be already finalized (unless standby)
    if (ret.isFinal && !ret.isStandby) {
      return NextResponse.json(
        { ok: false, error: "Ce retour est déjà finalisé" },
        { status: 400 }
      );
    }

    // Validation: Cannot be a draft
    if (ret.isDraft) {
      return NextResponse.json(
        { ok: false, error: "Ce retour est encore un brouillon" },
        { status: 400 }
      );
    }

    // Zod validation
    const raw = await request.json();
    const parsed = FinalizeReturnSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Calculate total weight and update products with finalization data
    let totalWeight = 0;

    if (body.products && Array.isArray(body.products)) {
      for (const p of body.products) {
        // Server-side compute: don't trust client qteInventaire
        const qteInventaire = p.quantiteRecue - p.qteDetruite;
        // tauxRestock conversion: body sends percentage, DB stores decimal
        const tauxRestock = p.tauxRestock !== undefined ? p.tauxRestock / 100 : null;

        await prisma.returnProduct.updateMany({
          where: { returnId: ret.id, codeProduit: p.codeProduit },
          data: {
            quantiteRecue: p.quantiteRecue,
            qteInventaire,
            qteDetruite: p.qteDetruite,
            tauxRestock,
          },
        });

        // Calculate total weight
        const product = ret.products.find((pr) => pr.codeProduit === p.codeProduit);
        if (product) {
          const qty = p.quantiteRecue ?? product.quantiteRecue ?? product.quantite ?? 0;
          const weight = product.weightProduit ? Number(product.weightProduit) : 0;
          totalWeight += qty * weight;
        }
      }
    }

    // Finalize the return
    await prisma.return.update({
      where: { id: returnId },
      data: {
        isFinal: true,
        isStandby: false,
        isDraft: false,
        finalizedBy: user.name || "Facturation",
        finalizedAt: new Date(),
        warehouseOrigin: body.warehouseOrigin ?? ret.warehouseOrigin,
        warehouseDestination: body.warehouseDestination ?? ret.warehouseDestination,
        noCredit: body.noCredit ?? ret.noCredit,
        noCredit2: body.noCredit2 ?? ret.noCredit2,
        noCredit3: body.noCredit3 ?? ret.noCredit3,
        creditedTo: body.creditedTo ?? ret.creditedTo,
        creditedTo2: body.creditedTo2 ?? ret.creditedTo2,
        creditedTo3: body.creditedTo3 ?? ret.creditedTo3,
        villeShipto: body.villeShipto ?? ret.villeShipto,
        totalWeight: totalWeight > 0 ? totalWeight : ret.totalWeight,
        transportAmount: body.chargeTransport ? body.transportAmount : null,
        restockingAmount: body.restockingAmount ?? ret.restockingAmount,
      },
    });

    // Fire-and-forget notification
    notifyReturnFinalized({
      returnId,
      returnCode: formatReturnCode(returnId),
      finalizedBy: user.name || "Facturation",
      tenantId,
    }).catch(console.error);

    return NextResponse.json({
      ok: true,
      message: "Retour finalisé avec succès",
      data: { id: formatReturnCode(returnId) },
    });
  } catch (error) {
    console.error("POST /api/returns/[code]/finalize error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la finalisation du retour" },
      { status: 500 }
    );
  }
}
