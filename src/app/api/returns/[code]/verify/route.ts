// src/app/api/returns/[code]/verify/route.ts
// Verify physical return - POST
// ONLY Vérificateur role can verify returns

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseReturnCode, formatReturnCode } from "@/types/returns";

type RouteParams = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const tenantId = session.user.activeTenantId;
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "Aucun tenant actif sélectionné" }, { status: 403 });
    }

    // CRITICAL: Only Vérificateur can verify returns
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "Vérificateur") {
      return NextResponse.json(
        { ok: false, error: "Seul un vérificateur peut vérifier les retours" },
        { status: 403 }
      );
    }

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

    // Validation: Must require physical return
    if (!ret.returnPhysical) {
      return NextResponse.json(
        { ok: false, error: "Ce retour ne nécessite pas de vérification physique" },
        { status: 400 }
      );
    }

    // Validation: Cannot be already verified
    if (ret.isVerified) {
      return NextResponse.json(
        { ok: false, error: "Ce retour a déjà été vérifié" },
        { status: 400 }
      );
    }

    // Validation: Cannot be finalized
    if (ret.isFinal) {
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

    const body = await request.json();
    const { products } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { ok: false, error: "Liste des produits requise avec quantités reçues" },
        { status: 400 }
      );
    }

    // Update each product with verification data
    for (const p of products) {
      // Validate: qteInventaire = quantiteRecue - qteDetruite
      const quantiteRecue = p.quantiteRecue ?? 0;
      const qteDetruite = p.qteDetruite ?? 0;
      const qteInventaire = quantiteRecue - qteDetruite;

      await prisma.returnProduct.updateMany({
        where: { returnId: ret.id, codeProduit: p.codeProduit },
        data: {
          quantiteRecue: quantiteRecue,
          qteInventaire: qteInventaire,
          qteDetruite: qteDetruite,
        },
      });
    }

    // Mark as verified
    await prisma.return.update({
      where: { id: returnId },
      data: {
        isVerified: true,
        verifiedBy: session.user.name || "Vérificateur",
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Retour vérifié avec succès",
      data: { id: formatReturnCode(returnId) },
    });
  } catch (error) {
    console.error("POST /api/returns/[code]/verify error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la vérification du retour" },
      { status: 500 }
    );
  }
}
