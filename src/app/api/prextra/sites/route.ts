// src/app/api/prextra/sites/route.ts
// Get list of warehouse sites - GET
// PostgreSQL version - queries replicated dbo."Sites" table

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, PREXTRA_TABLES } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    // Query replicated Prextra Sites table
    const result = await query<{ Name: string }>(
      `SELECT "Name" FROM ${PREXTRA_TABLES.SITES} 
       WHERE "Name" IS NOT NULL AND "Name" != ''
       ORDER BY "Name" ASC`
    );

    const sites = result.map((r) => r.Name);

    return NextResponse.json({ ok: true, sites });
  } catch (error) {
    console.error("GET /api/prextra/sites error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des sites" },
      { status: 500 }
    );
  }
}
