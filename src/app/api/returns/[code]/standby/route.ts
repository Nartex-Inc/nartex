// src/app/api/returns/[code]/standby/route.ts
// Toggle standby status - POST

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

    // Role check
    const userRole = (session.user as { role?: string }).role;
    if (!["Gestionnaire", "Facturation"].includes(userRole || "")) {
      return NextResponse.json(
        { ok: false, error: "Vous n'êtes pas autorisé à modifier le statut standby" },
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
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { action } = body; // "standby" or "reactivate"

    if (action === "standby") {
      // Put in standby - special state: isFinal=true, isDraft=true, isStandby=true
      await prisma.return.update({
        where: { id: returnId },
        data: {
          isFinal: true,
          isDraft: true,
          isStandby: true,
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Retour mis en standby",
        data: { id: formatReturnCode(returnId), status: "standby" },
      });
    } else if (action === "reactivate") {
      // Reactivate - reset to active state
      await prisma.return.update({
        where: { id: returnId },
        data: {
          isFinal: false,
          isDraft: false,
          isStandby: false,
          finalizedBy: null,
          finalizedAt: null,
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Retour réactivé",
        data: { id: formatReturnCode(returnId), status: "active" },
      });
    } else {
      return NextResponse.json(
        { ok: false, error: "Action invalide. Utilisez 'standby' ou 'reactivate'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("POST /api/returns/[code]/standby error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la modification du statut" },
      { status: 500 }
    );
  }
}
