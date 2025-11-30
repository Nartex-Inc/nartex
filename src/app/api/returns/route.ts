// src/app/api/returns/route.ts
// Main returns API - GET (list with filters), POST (create new return)
// PostgreSQL version - single AWS RDS database

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, withTransaction, PREXTRA_TABLES, NARTEX_TABLES } from "@/lib/db";
import {
  Return,
  ReturnProduct,
  Upload,
  ReturnRow,
  CreateReturnPayload,
  getReturnStatus,
} from "@/types/returns";

/* =============================================================================
   GET /api/returns - List returns with filters
============================================================================= */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const cause = searchParams.get("cause") || "";
    const reporter = searchParams.get("reporter") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const status = searchParams.get("status") || "";
    const take = parseInt(searchParams.get("take") || "200");
    const includeHistory = searchParams.get("history") === "true";

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Filter by final status (history vs active)
    if (includeHistory) {
      conditions.push("r.is_final = true");
    } else {
      conditions.push("r.is_final = false");
    }

    // Expert role filter - only show their own returns
    const userRole = (session.user as { role?: string }).role;
    const userName = session.user.name || "";
    if (userRole === "Expert") {
      conditions.push(`r.expert ILIKE $${paramIndex++}`);
      params.push(`%${userName}%`);
    }

    // Search query
    if (q) {
      conditions.push(`(
        r.code_retour::text LIKE $${paramIndex} OR
        r.client ILIKE $${paramIndex} OR
        r.no_commande ILIKE $${paramIndex} OR
        r.no_client ILIKE $${paramIndex} OR
        r.expert ILIKE $${paramIndex} OR
        EXISTS (SELECT 1 FROM return_products p WHERE p.return_id = r.id AND p.code_produit ILIKE $${paramIndex})
      )`);
      params.push(`%${q}%`);
      paramIndex++;
    }

    // Cause filter
    if (cause && cause !== "all") {
      conditions.push(`r.cause_retour = $${paramIndex++}`);
      params.push(cause);
    }

    // Reporter filter
    if (reporter && reporter !== "all") {
      conditions.push(`r.signale_par = $${paramIndex++}`);
      params.push(reporter);
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(`r.date_signalement >= $${paramIndex++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`r.date_signalement <= $${paramIndex++}`);
      params.push(dateTo);
    }

    // Status filter (draft, awaiting, received)
    if (status === "draft") {
      conditions.push("r.is_draft = true");
    } else if (status === "awaiting") {
      conditions.push("r.is_draft = false AND r.retour_physique = true AND r.is_verified = false");
    } else if (status === "received") {
      conditions.push("r.is_draft = false AND (r.retour_physique = false OR r.is_verified = true)");
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Main query
    const sql = `
      SELECT r.*,
        (SELECT COUNT(*) FROM uploads u WHERE u.return_id = r.id) AS attachment_count
      FROM returns r
      ${whereClause}
      ORDER BY r.date_signalement DESC, r.code_retour DESC
      LIMIT $${paramIndex}
    `;
    params.push(take);

    const rows = await query<Return & { attachment_count: number }>(sql, params);

    // Fetch products and attachments for each return
    const returnRows: ReturnRow[] = await Promise.all(
      rows.map(async (row) => {
        const products = await query<ReturnProduct>(
          "SELECT * FROM return_products WHERE return_id = $1 ORDER BY id",
          [row.id]
        );

        const attachments = await query<Upload>(
          "SELECT * FROM uploads WHERE return_id = $1 ORDER BY id",
          [row.id]
        );

        return mapToReturnRow(row, products, attachments);
      })
    );

    return NextResponse.json({ ok: true, rows: returnRows });
  } catch (error) {
    console.error("GET /api/returns error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des retours" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   POST /api/returns - Create new return
============================================================================= */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const body: CreateReturnPayload = await request.json();

    // Validate required fields
    if (!body.expert?.trim() || !body.client?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Expert et client sont requis" },
        { status: 400 }
      );
    }

    const result = await withTransaction(async (client) => {
      // Get next code_retour
      const maxResult = await client.query(
        "SELECT COALESCE(MAX(code_retour), 0) + 1 AS next_code FROM returns"
      );
      const nextCode = maxResult.rows[0].next_code;

      // Determine if draft based on required fields
      const hasRequiredFields =
        body.reporter &&
        body.cause &&
        body.products &&
        body.products.length > 0 &&
        body.products.every((p) => p.codeProduit && p.quantite > 0);

      const isDraft = !hasRequiredFields;

      // Insert into returns
      const insertResult = await client.query(
        `INSERT INTO returns (
          code_retour, date_signalement, signale_par, cause_retour, expert, montant,
          client, no_client, no_commande, no_tracking, date_commande, description,
          transporteur, retour_physique, is_draft, is_final, is_verified, is_standby,
          is_pickup, is_commande, is_reclamation, no_bill, no_bon_commande, no_reclamation,
          initie_par, date_initialization
        ) VALUES (
          $1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          false, false, false, $15, $16, $17, $18, $19, $20, $21, NOW()
        ) RETURNING id, code_retour`,
        [
          nextCode,
          body.reporter || "expert",
          body.cause || "production",
          body.expert.trim(),
          body.amount || null,
          body.client.trim(),
          body.noClient?.trim() || null,
          body.noCommande?.trim() || null,
          body.tracking?.trim() || null,
          body.dateCommande || null,
          body.description?.trim() || null,
          body.transport?.trim() || null,
          body.retourPhysique || false,
          isDraft,
          body.isPickup || false,
          body.isCommande || false,
          body.isReclamation || false,
          body.noBill?.trim() || null,
          body.noBonCommande?.trim() || null,
          body.noReclamation?.trim() || null,
          session.user.name || "Système",
        ]
      );

      const returnId = insertResult.rows[0].id;
      const codeRetour = insertResult.rows[0].code_retour;

      // Insert products
      if (body.products && body.products.length > 0) {
        for (const product of body.products) {
          await client.query(
            `INSERT INTO return_products (return_id, code_retour, code_produit, quantite, descr_produit, description_retour)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              returnId,
              codeRetour,
              product.codeProduit.trim(),
              product.quantite,
              product.descriptionProduit?.trim() || null,
              product.descriptionRetour?.trim() || null,
            ]
          );
        }
      }

      return { id: returnId, codeRetour };
    });

    return NextResponse.json({
      ok: true,
      return: {
        id: `R${result.codeRetour}`,
        code_retour: result.codeRetour,
      },
    });
  } catch (error) {
    console.error("POST /api/returns error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la création du retour" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   Helper Functions
============================================================================= */

function mapToReturnRow(
  row: Return & { attachment_count?: number },
  products: ReturnProduct[],
  attachments: Upload[]
): ReturnRow {
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
      ? {
          name: row.verifie_par,
          at: row.date_verification
            ? new Date(row.date_verification).toISOString()
            : null,
        }
      : null,
    finalizedBy: row.finalise_par
      ? {
          name: row.finalise_par,
          at: row.date_finalisation
            ? new Date(row.date_finalisation).toISOString()
            : null,
        }
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
