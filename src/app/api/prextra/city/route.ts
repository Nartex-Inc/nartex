// src/app/api/prextra/city/route.ts
// City and transport zone lookup for shipping calculation - GET
// PostgreSQL version - queries replicated Prextra tables
//
// IMPORTANT: This route requires the following tables to be added to your DMS replication:
// - dbo."Shipto"
// - dbo."_City"
// - dbo."_CitySetting"
// - dbo."_TransportChartDTL"

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, PREXTRA_TABLES } from "@/lib/db";

/* =============================================================================
   Transport Rates by Zone
   Zone codes: A, B, C, D, E, Z
   Weight tiers: 0-10lb, 10-400lb, 400-800lb, 800-1000lb, 1000+lb
============================================================================= */

export const TRANSPORT_RATES: Record<string, number[]> = {
  A: [15.0, 0.08, 0.07, 0.06, 0.05],
  B: [18.0, 0.10, 0.09, 0.08, 0.07],
  C: [22.0, 0.12, 0.11, 0.10, 0.09],
  D: [28.0, 0.15, 0.14, 0.12, 0.11],
  E: [35.0, 0.18, 0.16, 0.14, 0.12],
  Z: [50.0, 0.25, 0.22, 0.20, 0.18], // Remote zones
};

/**
 * Calculate shipping cost based on zone and weight
 */
export function calculateShippingCost(zone: string, weightLbs: number): number {
  const rates = TRANSPORT_RATES[zone.toUpperCase()] || TRANSPORT_RATES.Z;

  if (weightLbs <= 10) {
    return rates[0]; // Flat rate for 0-10 lb
  } else if (weightLbs <= 400) {
    return rates[0] + (weightLbs - 10) * rates[1];
  } else if (weightLbs <= 800) {
    return rates[0] + 390 * rates[1] + (weightLbs - 400) * rates[2];
  } else if (weightLbs <= 1000) {
    return rates[0] + 390 * rates[1] + 400 * rates[2] + (weightLbs - 800) * rates[3];
  } else {
    return (
      rates[0] +
      390 * rates[1] +
      400 * rates[2] +
      200 * rates[3] +
      (weightLbs - 1000) * rates[4]
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sonbr = searchParams.get("sonbr");

    if (!sonbr) {
      return NextResponse.json(
        { ok: false, error: "Numéro de commande (sonbr) requis" },
        { status: 400 }
      );
    }

    // Query replicated Prextra tables for city and transport zone
    // This requires the missing tables to be added to DMS replication
    const result = await query<{ City: string; _Code: string }>(
      `SELECT 
        shipto."City",
        tc."_Code"
       FROM ${PREXTRA_TABLES.INV_HEADER} inv
       INNER JOIN ${PREXTRA_TABLES.SHIPTO} shipto ON inv."shiptoid" = shipto."ShipToId"
       INNER JOIN ${PREXTRA_TABLES.CITY} city ON shipto."City" = city."_Name"
       INNER JOIN ${PREXTRA_TABLES.CITY_SETTING} cs ON city."_cityid" = cs."_CityId"
       INNER JOIN ${PREXTRA_TABLES.TRANSPORT_CHART} tc ON cs."_ChartDtlId" = tc."_ChartDtlId"
       WHERE inv."sonbr" = $1
       LIMIT 1`,
      [sonbr]
    );

    if (result.length === 0) {
      return NextResponse.json({
        ok: true,
        found: false,
        city: null,
        code: null,
        message: "Aucune information de transport trouvée pour cette commande",
      });
    }

    const row = result[0];

    return NextResponse.json({
      ok: true,
      found: true,
      city: row.City,
      code: row._Code,
    });
  } catch (error) {
    console.error("GET /api/prextra/city error:", error);
    
    // Check if error is due to missing tables
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("does not exist") || errorMessage.includes("relation")) {
      return NextResponse.json({
        ok: false,
        error: "Tables de transport manquantes. Ajoutez Shipto, _City, _CitySetting, _TransportChartDTL à votre réplication DMS.",
      }, { status: 500 });
    }
    
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la recherche de la zone de transport" },
      { status: 500 }
    );
  }
}
