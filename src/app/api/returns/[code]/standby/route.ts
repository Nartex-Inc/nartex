// src/app/api/returns/[code]/standby/route.ts
// Standby toggle - POST
// PostgreSQL version

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { Return } from "@/types/returns";

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
    const codeRetour = parseInt(code.replace(/^R/i, ""), 10);
    const body = await request.json();
    const action = body.action as "standby" | "reactivate";

    if (isNaN(codeRetour)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    if (!action || !["standby", "reactivate"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Action invalide. Utilisez 'standby' ou 'reactivate'" },
        { status: 400 }
      );
    }

    // Get existing return
    const returns = await query<Return>(
      "SELECT * FROM returns WHERE code_retour = $1",
      [codeRetour]
    );

    if (returns.length === 0) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    const existing = returns[0];

    if (action === "standby") {
      // Put into standby mode ("entre deux chaises")
      // is_final=1, is_draft=1, is_standby=1 creates a special state
      await query(
        `UPDATE returns SET
          is_final = true,
          is_draft = true,
          is_standby = true
        WHERE id = $1`,
        [existing.id]
      );

      return NextResponse.json({ ok: true, message: "Retour mis en standby" });
    } else {
      // Reactivate - put back to active state
      await query(
        `UPDATE returns SET
          is_final = false,
          is_draft = false,
          is_standby = false,
          finalise_par = NULL,
          date_finalisation = NULL
        WHERE id = $1`,
        [existing.id]
      );

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
