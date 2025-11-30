// src/app/api/returns/[code]/route.ts
// Single return API - GET (detail), PUT (update), DELETE (remove)
// PostgreSQL version

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import { Return, ReturnProduct, Upload, ReturnRow, UpdateReturnPayload, getReturnStatus } from "@/types/returns";

type RouteParams = { params: Promise<{ code: string }> };

/* =============================================================================
   GET /api/returns/[code] - Get single return detail
============================================================================= */

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { code } = await params;
    const codeRetour = parseInt(code.replace(/^R/i, ""), 10);

    if (isNaN(codeRetour)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    // Get return
    const returns = await query<Return>(
      "SELECT * FROM returns WHERE code_retour = $1",
      [codeRetour]
    );

    if (returns.length === 0) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    const row = returns[0];

    // Expert role check - can only see their own returns
    const userRole = (session.user as { role?: string }).role;
    const userName = session.user.name || "";
    if (userRole === "Expert" && !row.expert?.toLowerCase().includes(userName.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Accès non autorisé" }, { status: 403 });
    }

    // Get products
    const products = await query<ReturnProduct>(
      "SELECT * FROM return_products WHERE return_id = $1 ORDER BY id",
      [row.id]
    );

    // Get attachments
    const attachments = await query<Upload>(
      "SELECT * FROM uploads WHERE return_id = $1 ORDER BY id",
      [row.id]
    );

    const returnRow = mapToReturnRow(row, products, attachments);

    return NextResponse.json({ ok: true, return: returnRow });
  } catch (error) {
    console.error("GET /api/returns/[code] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement du retour" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   PUT /api/returns/[code] - Update return
============================================================================= */

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { code } = await params;
    const codeRetour = parseInt(code.replace(/^R/i, ""), 10);
    const body: UpdateReturnPayload = await request.json();

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
    const userRole = (session.user as { role?: string }).role;

    // Check if return can be edited
    if (existing.is_final && !existing.is_standby) {
      return NextResponse.json(
        { ok: false, error: "Ce retour est finalisé et ne peut plus être modifié" },
        { status: 400 }
      );
    }

    // Expert can only edit their own returns
    const userName = session.user.name || "";
    if (userRole === "Expert" && !existing.expert?.toLowerCase().includes(userName.toLowerCase())) {
      return NextResponse.json({ ok: false, error: "Accès non autorisé" }, { status: 403 });
    }

    // Vérificateur cannot edit general info
    if (userRole === "Vérificateur" && !existing.is_verified) {
      // They should use the verify endpoint instead
    }

    await withTransaction(async (client) => {
      // Determine if still draft
      const hasRequiredFields =
        body.reporter &&
        body.cause &&
        body.expert?.trim() &&
        body.client?.trim() &&
        body.products &&
        body.products.length > 0 &&
        body.products.every((p) => p.codeProduit && p.quantite > 0);

      const isDraft = body.isDraft !== undefined ? body.isDraft : !hasRequiredFields;

      // Update return
      await client.query(
        `UPDATE returns SET
          signale_par = COALESCE($1, signale_par),
          cause_retour = COALESCE($2, cause_retour),
          expert = COALESCE($3, expert),
          montant = $4,
          client = COALESCE($5, client),
          no_client = $6,
          no_commande = $7,
          no_tracking = $8,
          date_commande = $9,
          description = $10,
          transporteur = $11,
          retour_physique = COALESCE($12, retour_physique),
          is_draft = $13,
          is_pickup = COALESCE($14, is_pickup),
          is_commande = COALESCE($15, is_commande),
          is_reclamation = COALESCE($16, is_reclamation),
          no_bill = $17,
          no_bon_commande = $18,
          no_reclamation = $19
        WHERE code_retour = $20`,
        [
          body.reporter,
          body.cause,
          body.expert?.trim(),
          body.amount ?? existing.montant,
          body.client?.trim(),
          body.noClient?.trim() ?? existing.no_client,
          body.noCommande?.trim() ?? existing.no_commande,
          body.tracking?.trim() ?? existing.no_tracking,
          body.dateCommande ?? existing.date_commande,
          body.description?.trim() ?? existing.description,
          body.transport?.trim() ?? existing.transporteur,
          body.retourPhysique,
          isDraft,
          body.isPickup,
          body.isCommande,
          body.isReclamation,
          body.noBill?.trim() ?? existing.no_bill,
          body.noBonCommande?.trim() ?? existing.no_bon_commande,
          body.noReclamation?.trim() ?? existing.no_reclamation,
          codeRetour,
        ]
      );

      // Update products if provided
      if (body.products) {
        // Delete existing products
        await client.query("DELETE FROM return_products WHERE return_id = $1", [existing.id]);

        // Insert new products
        for (const product of body.products) {
          await client.query(
            `INSERT INTO return_products (return_id, code_retour, code_produit, quantite, descr_produit, description_retour)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              existing.id,
              codeRetour,
              product.codeProduit.trim(),
              product.quantite,
              product.descriptionProduit?.trim() || null,
              product.descriptionRetour?.trim() || null,
            ]
          );
        }
      }
    });

    return NextResponse.json({ ok: true, message: "Retour mis à jour" });
  } catch (error) {
    console.error("PUT /api/returns/[code] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la mise à jour du retour" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   DELETE /api/returns/[code] - Delete return (Gestionnaire only)
============================================================================= */

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "Gestionnaire") {
      return NextResponse.json(
        { ok: false, error: "Seul un Gestionnaire peut supprimer un retour" },
        { status: 403 }
      );
    }

    const { code } = await params;
    const codeRetour = parseInt(code.replace(/^R/i, ""), 10);

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

    // Cannot delete verified or finalized returns
    if (existing.is_verified || existing.is_final) {
      return NextResponse.json(
        { ok: false, error: "Impossible de supprimer un retour vérifié ou finalisé" },
        { status: 400 }
      );
    }

    // Delete (cascades to products and uploads)
    await query("DELETE FROM returns WHERE id = $1", [existing.id]);

    return NextResponse.json({ ok: true, message: "Retour supprimé" });
  } catch (error) {
    console.error("DELETE /api/returns/[code] error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la suppression du retour" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   Helper Functions
============================================================================= */

function mapToReturnRow(row: Return, products: ReturnProduct[], attachments: Upload[]): ReturnRow {
  const status = getReturnStatus(row);

  return {
    id: `R${row.code_retour}`,
    codeRetour: row.code_retour,
    reportedAt: row.date_signalement
      ? new Date(row.date_signalement).toISOString()
      : new Date().toISOString(),
    reporter: row.signale_par,
    cause: row.cause_retour,
    expert: row.expert || "",
    client: row.client || "",
    noClient: row.no_client || undefined,
    noCommande: row.no_commande || undefined,
    tracking: row.no_tracking || undefined,
    status,
    standby: row.is_standby,
    amount: row.montant,
    dateCommande: row.date_commande,
    transport: row.transporteur,
    description: row.description || undefined,
    attachments: attachments.map((a) => ({
      id: a.file_path,
      name: a.file_name,
      url: `https://drive.google.com/file/d/${a.file_path}/preview`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${a.file_path}`,
    })),
    products: products.map((p) => ({
      id: String(p.id),
      codeProduit: p.code_produit,
      descriptionProduit: p.descr_produit || "",
      descriptionRetour: p.description_retour || undefined,
      quantite: p.quantite,
      poidsUnitaire: p.weight_produit,
      poidsTotal: p.poids,
      quantiteRecue: p.quantite_recue,
      qteInventaire: p.qte_inventaire,
      qteDetruite: p.qte_detruite,
      tauxRestock: p.taux_restock,
    })),
    createdBy: row.initie_par
      ? {
          name: row.initie_par,
          avatar: null,
          at: row.date_initialization
            ? new Date(row.date_initialization).toISOString()
            : new Date().toISOString(),
        }
      : undefined,
    retourPhysique: row.retour_physique,
    isPickup: row.is_pickup,
    isCommande: row.is_commande,
    isReclamation: row.is_reclamation,
    noBill: row.no_bill,
    noBonCommande: row.no_bon_commande,
    noReclamation: row.no_reclamation,
    verifiedBy: row.verifie_par
      ? { name: row.verifie_par, at: row.date_verification ? new Date(row.date_verification).toISOString() : null }
      : null,
    finalizedBy: row.finalise_par
      ? { name: row.finalise_par, at: row.date_finalisation ? new Date(row.date_finalisation).toISOString() : null }
      : null,
    entrepotDepart: row.entrepot_depart,
    entrepotDestination: row.entrepot_destination,
    noCredit: row.no_credit,
    noCredit2: row.no_credit2,
    noCredit3: row.no_credit3,
    crediteA: row.credite_a,
    crediteA2: row.credite_a2,
    crediteA3: row.credite_a3,
    villeShipto: row.ville_shipto,
    poidsTotal: row.poids_total,
    montantTransport: row.montant_transport,
    montantRestocking: row.montant_restocking,
  };
}
