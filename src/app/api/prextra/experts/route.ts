// src/app/api/prextra/experts/route.ts
// Get list of sales representatives (experts) - GET
// PostgreSQL version - queries replicated dbo."Salesrep" table

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

    // Query replicated Prextra Salesrep table
    const result = await query<{ Name: string }>(
      `SELECT DISTINCT "Name" FROM ${PREXTRA_TABLES.SALESREP} 
       WHERE "Name" IS NOT NULL AND "Name" != ''
       ORDER BY "Name" ASC`
    );

    const experts = result.map((r) => r.Name);

    return NextResponse.json({ ok: true, experts });
  } catch (error) {
    console.error("GET /api/prextra/experts error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des experts" },
      { status: 500 }
    );
  }
}
