// src/app/api/returns/[code]/standby/route.ts
// Standby toggle - POST

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
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
        { ok: false, error: "Vous n'êtes pas autorisé à mettre un retour en standby" },
        { status: 403 }
      );
    }

    const { code } = await params;
    const returnId = parseReturnCode(code);
    const body = await request.json();
    const action = body.action as "standby" | "reactivate";

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    if (!action || !["standby", "reactivate"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Action invalide. Utilisez 'standby' ou 'reactivate'" },
        { status: 400 }
      );
    }

    const existing = await prisma.return.findFirst({
      where: { OR: [{ id: returnId }, { code: code.toUpperCase() }] },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    if (action === "standby") {
      // Put into standby mode
      await prisma.return.update({
        where: { id: existing.id },
        data: {
          isFinal: true,
          isDraft: true,
          isStandby: true,
        },
      });

      return NextResponse.json({ ok: true, message: "Retour mis en standby" });
    } else {
      // Reactivate
      await prisma.return.update({
        where: { id: existing.id },
        data: {
          isFinal: false,
          isDraft: false,
          isStandby: false,
          finalisePar: null,
          dateFinalisation: null,
          status: existing.retourPhysique && !existing.isVerified 
            ? "awaiting_physical" 
            : "received_or_no_physical",
        },
      });

      return NextResponse.json({ ok: true, message: "Retour réactivé" });
    }
  } catch (error) {
    console.error("POST /api/returns/[code]/standby error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la mise à jour du statut" },
      { status: 500 }
    );
  }
}
