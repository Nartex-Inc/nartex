// src/app/api/returns/[code]/finalize/route.ts
// Finalize return - POST

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import type { FinalizeReturnPayload } from "@/types/returns";
import { parseReturnCode } from "@/types/returns";

type RouteParams = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    // Role check
    const userRole = (session.user as { role?: string }).role;
    const allowedRoles = ["Gestionnaire", "Facturation"];
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { ok: false, error: "Vous n'êtes pas autorisé à finaliser les retours" },
        { status: 403 }
      );
    }

    const { code } = await params;
    const returnId = parseReturnCode(code);
    const body: FinalizeReturnPayload = await request.json();

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const existing = await prisma.return.findFirst({
      where: { OR: [{ id: returnId }, { code: code.toUpperCase() }] },
      include: { products: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Validate state
    if (existing.retourPhysique && !existing.isVerified) {
      return NextResponse.json(
        { ok: false, error: "Ce retour physique doit être vérifié avant la finalisation" },
        { status: 400 }
      );
    }

    if (existing.isFinal && !existing.isStandby) {
      return NextResponse.json(
        { ok: false, error: "Ce retour est déjà finalisé" },
        { status: 400 }
      );
    }

    // Update product quantities and restock rates
    let totalWeight = 0;
    for (const product of body.products) {
      const tauxRestockDecimal = product.tauxRestock ? product.tauxRestock / 100 : null;

      await prisma.returnProduct.updateMany({
        where: { returnId: existing.id, codeProduit: product.codeProduit },
        data: {
          quantiteRecue: product.quantiteRecue,
          qteInventaire: product.qteInventaire,
          qteDetruite: product.qteDetruite,
          tauxRestock: tauxRestockDecimal,
        },
      });
    }

    // Calculate total weight
    const updatedProducts = await prisma.returnProduct.findMany({
      where: { returnId: existing.id },
    });

    for (const p of updatedProducts) {
      if (p.poids) {
        totalWeight += Number(p.poids);
      } else if (p.weightProduit && p.quantiteRecue) {
        totalWeight += Number(p.weightProduit) * p.quantiteRecue;
      }
    }

    // Finalize the return
    await prisma.return.update({
      where: { id: existing.id },
      data: {
        isFinal: true,
        isStandby: false,
        isDraft: false,
        finalisePar: session.user.name || "Système",
        dateFinalisation: new Date(),
        entrepotDepart: body.entrepotDepart || null,
        entrepotDestination: body.entrepotDestination || null,
        noCredit: body.noCredit || null,
        noCredit2: body.noCredit2 || null,
        noCredit3: body.noCredit3 || null,
        crediteA: body.crediteA || null,
        crediteA2: body.crediteA2 || null,
        crediteA3: body.crediteA3 || null,
        poidsTotal: totalWeight || null,
        montantTransport: body.chargerTransport ? body.montantTransport : null,
        montantRestocking: body.montantRestocking || null,
      },
    });

    return NextResponse.json({ ok: true, message: "Retour finalisé avec succès" });
  } catch (error) {
    console.error("POST /api/returns/[code]/finalize error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la finalisation du retour" },
      { status: 500 }
    );
  }
}
