// src/app/api/prextra/city/route.ts
// City and transport zone lookup for shipping calculation - GET
//
// IMPORTANT: This route requires these tables to be added to DMS replication:
// - "Shipto"
// - "_City"
// - "_CitySetting"
// - "_TransportChartDTL"

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCityAndZone, debugCityZone } from "@/lib/prextra";
import { TRANSPORT_RATES, calculateShippingCost } from "@/types/returns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const schema = session.user.prextraSchema;
    if (!schema) {
      return NextResponse.json({ ok: false, error: "Aucune donnée ERP pour ce tenant" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sonbr = searchParams.get("sonbr");
    const weight = searchParams.get("weight");
    const debug = searchParams.get("debug") === "1";

    if (!sonbr) {
      return NextResponse.json(
        { ok: false, error: "Numéro de commande (sonbr) requis" },
        { status: 400 }
      );
    }

    // Debug mode: return diagnostics about each table in the join chain
    if (debug) {
      const diag = await debugCityZone(sonbr, schema);
      return NextResponse.json({ ok: true, debug: true, diagnostics: diag });
    }

    const result = await getCityAndZone(sonbr, schema);

    if (!result) {
      return NextResponse.json({
        ok: true,
        found: false,
        city: null,
        code: null,
        message: "Aucune information de transport trouvée. Tables manquantes dans la réplication DMS?",
      });
    }

    // Optionally calculate shipping cost if weight is provided
    let shippingCost: number | null = null;
    if (weight && result._Code) {
      const weightNum = parseFloat(weight);
      if (!isNaN(weightNum)) {
        shippingCost = calculateShippingCost(result._Code, weightNum);
      }
    }

    return NextResponse.json({
      ok: true,
      found: true,
      city: result.City,
      code: result._Code,
      shippingCost,
      rates: TRANSPORT_RATES,
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
