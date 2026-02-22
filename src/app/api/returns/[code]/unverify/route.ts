// src/app/api/returns/[code]/unverify/route.ts
// Revert verification on a return - POST
// ONLY Gestionnaire (admin) can un-verify returns

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseReturnCode, formatReturnCode } from "@/types/returns";
import { requireTenant, requireRoles } from "@/lib/auth-helpers";

type RouteParams = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    // Only Gestionnaire can un-verify
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

    if (!ret.isVerified) {
      return NextResponse.json(
        { ok: false, error: "Ce retour n'est pas vérifié" },
        { status: 400 }
      );
    }

    if (ret.isFinal) {
      return NextResponse.json(
        { ok: false, error: "Impossible d'annuler la vérification d'un retour finalisé" },
        { status: 400 }
      );
    }

    // Reset verification fields on products
    await prisma.returnProduct.updateMany({
      where: { returnId: ret.id },
      data: {
        quantiteRecue: null,
        qteInventaire: null,
        qteDetruite: null,
      },
    });

    // Reset verification on the return
    await prisma.return.update({
      where: { id: returnId },
      data: {
        isVerified: false,
        verifiedBy: null,
        verifiedAt: null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Vérification annulée avec succès",
      data: { id: formatReturnCode(returnId) },
    });
  } catch (error) {
    console.error("POST /api/returns/[code]/unverify error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de l'annulation de la vérification" },
      { status: 500 }
    );
  }
}
