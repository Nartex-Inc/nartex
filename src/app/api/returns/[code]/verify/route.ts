// src/app/api/returns/[code]/verify/route.ts
// Verify physical return - POST
// ONLY Vérificateur role can verify returns

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseReturnCode, formatReturnCode } from "@/types/returns";
import { notifyReturnVerified } from "@/lib/notifications";
import { requireTenant, requireRoles } from "@/lib/auth-helpers";
import { VerifyReturnSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    // CRITICAL: Only Vérificateur can verify returns
    const roleError = requireRoles(user, ["verificateur"]);
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

    // Zod validation
    const raw = await request.json();
    const parsed = VerifyReturnSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { products } = parsed.data;

    // Validate: qteDetruite <= quantiteRecue per product
    for (const p of products) {
      if (p.qteDetruite > p.quantiteRecue) {
        return NextResponse.json(
          {
            ok: false,
            error: `Produit ${p.codeProduit}: qteDetruite (${p.qteDetruite}) ne peut pas dépasser quantiteRecue (${p.quantiteRecue})`,
          },
          { status: 400 }
        );
      }
    }

    // Update each product with verification data
    for (const p of products) {
      const qteInventaire = p.quantiteRecue - p.qteDetruite;

      await prisma.returnProduct.updateMany({
        where: { returnId: ret.id, codeProduit: p.codeProduit },
        data: {
          quantiteRecue: p.quantiteRecue,
          qteInventaire,
          qteDetruite: p.qteDetruite,
        },
      });
    }

    // Mark as verified
    await prisma.return.update({
      where: { id: returnId },
      data: {
        isVerified: true,
        verifiedBy: user.name || "Vérificateur",
        verifiedAt: new Date(),
      },
    });

    // Fire-and-forget notification
    notifyReturnVerified({
      returnId,
      returnCode: formatReturnCode(returnId),
      verifiedBy: user.name || "Vérificateur",
      tenantId,
    }).catch(console.error);

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
