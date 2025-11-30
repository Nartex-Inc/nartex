// src/app/api/returns/next-code/route.ts
// Get next available code_retour - GET
// PostgreSQL version

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    // Get max code_retour + 1
    const result = await query<{ next_code: number }>(
      "SELECT COALESCE(MAX(code_retour), 0) + 1 AS next_code FROM returns"
    );

    const nextCode = result[0]?.next_code || 1;

    return NextResponse.json({
      ok: true,
      nextCode,
      formatted: `R${nextCode}`,
    });
  } catch (error) {
    console.error("GET /api/returns/next-code error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la récupération du prochain code" },
      { status: 500 }
    );
  }
}
