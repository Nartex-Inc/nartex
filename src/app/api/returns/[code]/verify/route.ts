// src/app/api/returns/[code]/verify/route.ts
// Verify physical return - POST
// PostgreSQL version

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { Return, VerifyReturnPayload } from "@/types/returns";

type RouteParams = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    // Role check
    const userRole = (session.user as { role?: string }).role;
    const allowedRoles = ["Vérificateur", "Gestionnaire", "Facturation"];
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { ok: false, error: "Vous n'êtes pas autorisé à vérifier les retours" },
        { status: 403 }
      );
    }

    const { code } = await params;
    const codeRetour = parseInt(code.replace(/^R/i, ""), 10);
    const body: VerifyReturnPayload = await request.json();

    if (isNaN(codeRetour)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
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

    // Validate state
    if (!existing.retour_physique) {
      return NextResponse.json(
        { ok: false, error: "Ce retour n'est pas marqué comme retour physique" },
        { status: 400 }
      );
    }

    if (existing.is_verified) {
      return NextResponse.json(
        { ok: false, error: "Ce retour a déjà été vérifié" },
        { status: 400 }
      );
    }

    if (existing.is_final) {
      return NextResponse.json(
        { ok: false, error: "Ce retour est déjà finalisé" },
        { status: 400 }
      );
    }

    await withTransaction(async (client) => {
      // Update product quantities
      for (const product of body.products) {
        await client.query(
          `UPDATE return_products SET
            quantite_recue = $1,
            qte_inventaire = $2,
            qte_detruite = $3
          WHERE return_id = $4 AND code_produit = $5`,
          [
            product.quantiteRecue,
            product.qteInventaire,
            product.qteDetruite,
            existing.id,
            product.codeProduit,
          ]
        );
      }

      // Mark return as verified
      await client.query(
        `UPDATE returns SET
          is_verified = true,
          verifie_par = $1,
          date_verification = NOW()
        WHERE id = $2`,
        [session.user?.name || "Système", existing.id]
      );
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
