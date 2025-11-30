// src/app/api/returns/[code]/finalize/route.ts
// Finalize return - POST
// PostgreSQL version

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { Return, ReturnProduct, FinalizeReturnPayload } from "@/types/returns";

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
    const codeRetour = parseInt(code.replace(/^R/i, ""), 10);
    const body: FinalizeReturnPayload = await request.json();

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

    // Validate state - must be verified if physical return
    if (existing.retour_physique && !existing.is_verified) {
      return NextResponse.json(
        { ok: false, error: "Ce retour physique doit être vérifié avant la finalisation" },
        { status: 400 }
      );
    }

    if (existing.is_final && !existing.is_standby) {
      return NextResponse.json(
        { ok: false, error: "Ce retour est déjà finalisé" },
        { status: 400 }
      );
    }

    await withTransaction(async (client) => {
      // Update product quantities and restock rates
      let totalWeight = 0;
      for (const product of body.products) {
        // Convert percentage to decimal (e.g., 15 -> 0.15)
        const tauxRestockDecimal = product.tauxRestock
          ? product.tauxRestock / 100
          : null;

        await client.query(
          `UPDATE return_products SET
            quantite_recue = $1,
            qte_inventaire = $2,
            qte_detruite = $3,
            taux_restock = $4
          WHERE return_id = $5 AND code_produit = $6`,
          [
            product.quantiteRecue,
            product.qteInventaire,
            product.qteDetruite,
            tauxRestockDecimal,
            existing.id,
            product.codeProduit,
          ]
        );
      }

      // Calculate total weight from products
      const products = await client.query<ReturnProduct>(
        "SELECT * FROM return_products WHERE return_id = $1",
        [existing.id]
      );

      for (const p of products.rows) {
        if (p.poids) {
          totalWeight += Number(p.poids);
        } else if (p.weight_produit && p.quantite_recue) {
          totalWeight += Number(p.weight_produit) * Number(p.quantite_recue);
        }
      }

      // Mark return as finalized
      await client.query(
        `UPDATE returns SET
          is_final = true,
          is_standby = false,
          is_draft = false,
          finalise_par = $1,
          date_finalisation = NOW(),
          entrepot_depart = $2,
          entrepot_destination = $3,
          no_credit = $4,
          no_credit2 = $5,
          no_credit3 = $6,
          credite_a = $7,
          credite_a2 = $8,
          credite_a3 = $9,
          poids_total = $10,
          montant_transport = $11,
          montant_restocking = $12
        WHERE id = $13`,
        [
          session.user?.name || "Système",
          body.entrepotDepart || null,
          body.entrepotDestination || null,
          body.noCredit || null,
          body.noCredit2 || null,
          body.noCredit3 || null,
          body.crediteA || null,
          body.crediteA2 || null,
          body.crediteA3 || null,
          totalWeight || null,
          body.chargerTransport ? body.montantTransport : null,
          body.montantRestocking || null,
          existing.id,
        ]
      );
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
