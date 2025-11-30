// src/app/api/returns/[code]/verify/route.ts
// Verify physical return - POST

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import type { VerifyReturnPayload } from "@/types/returns";
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
    const allowedRoles = ["Verificateur", "Gestionnaire", "Facturation"];
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { ok: false, error: "Vous n'êtes pas autorisé à vérifier les retours" },
        { status: 403 }
      );
    }

    const { code } = await params;
    const returnId = parseReturnCode(code);
    const body: VerifyReturnPayload = await request.json();

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const existing = await prisma.return.findFirst({
      where: { OR: [{ id: returnId }, { code: code.toUpperCase() }] },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Validate state
    if (!existing.retourPhysique) {
      return NextResponse.json(
        { ok: false, error: "Ce retour n'est pas marqué comme retour physique" },
        { status: 400 }
      );
    }

    if (existing.isVerified) {
      return NextResponse.json(
        { ok: false, error: "Ce retour a déjà été vérifié" },
        { status: 400 }
      );
    }

    if (existing.isFinal) {
      return NextResponse.json(
        { ok: false, error: "Ce retour est déjà finalisé" },
        { status: 400 }
      );
    }

    // Update product quantities
    for (const product of body.products) {
      await prisma.returnProduct.updateMany({
        where: { returnId: existing.id, codeProduit: product.codeProduit },
        data: {
          quantiteRecue: product.quantiteRecue,
          qteInventaire: product.qteInventaire,
          qteDetruite: product.qteDetruite,
        },
      });
    }

    // Mark return as verified
    await prisma.return.update({
      where: { id: existing.id },
      data: {
        isVerified: true,
        verifiePar: session.user.name || "Système",
        dateVerification: new Date(),
        status: "received_or_no_physical",
      },
    });

    return NextResponse.json({ ok: true, message: "Retour vérifié avec succès" });
  } catch (error) {
    console.error("POST /api/returns/[code]/verify error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la vérification du retour" },
      { status: 500 }
    );
  }
}
