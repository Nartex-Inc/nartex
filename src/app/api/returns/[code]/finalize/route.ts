// src/app/api/returns/[code]/finalize/route.ts
// Finalize return - POST
// ONLY Facturation role can finalize returns

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

    // CRITICAL: Only Facturation can finalize returns
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "Facturation") {
      return NextResponse.json(
        { ok: false, error: "Seul le rôle Facturation peut finaliser les retours" },
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

    const body = await request.json();
    const { 
      products, 
      warehouseOrigin, 
      warehouseDestination,
      noCredit,
      noCredit2,
      noCredit3,
      creditedTo,
      creditedTo2,
      creditedTo3,
      transportAmount,
      restockingAmount,
      chargeTransport,
      villeShipto,
    } = body;

    // Calculate total weight and update products with finalization data
    let totalWeight = 0;
    
    if (products && Array.isArray(products)) {
      for (const p of products) {
        const tauxRestock = p.tauxRestock !== undefined ? p.tauxRestock / 100 : null;
        
        await prisma.returnProduct.updateMany({
          where: { returnId: ret.id, codeProduit: p.codeProduit },
          data: {
            quantiteRecue: p.quantiteRecue ?? 0,
            qteInventaire: p.qteInventaire ?? 0,
            qteDetruite: p.qteDetruite ?? 0,
            tauxRestock: tauxRestock,
          },
        });

        // Calculate total weight
        const product = ret.products.find((pr: { codeProduit: string | null; quantiteRecue: number | null; quantite: number | null; weightProduit: any }) => pr.codeProduit === p.codeProduit);
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
        finalizedBy: session.user.name || "Facturation",
        finalizedAt: new Date(),
        warehouseOrigin: warehouseOrigin ?? ret.warehouseOrigin,
        warehouseDestination: warehouseDestination ?? ret.warehouseDestination,
        noCredit: noCredit ?? ret.noCredit,
        noCredit2: noCredit2 ?? ret.noCredit2,
        noCredit3: noCredit3 ?? ret.noCredit3,
        creditedTo: creditedTo ?? ret.creditedTo,
        creditedTo2: creditedTo2 ?? ret.creditedTo2,
        creditedTo3: creditedTo3 ?? ret.creditedTo3,
        villeShipto: villeShipto ?? ret.villeShipto,
        totalWeight: totalWeight > 0 ? totalWeight : ret.totalWeight,
        transportAmount: chargeTransport ? transportAmount : null,
        restockingAmount: restockingAmount ?? ret.restockingAmount,
      },
    });

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
