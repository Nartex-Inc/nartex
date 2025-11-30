// src/app/api/prextra/sites/route.ts
// Get list of warehouse sites - GET

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { getSites } from "@/lib/prextra";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const sites = await getSites();

    return NextResponse.json({ ok: true, sites });
  } catch (error) {
    console.error("GET /api/prextra/sites error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des sites" },
      { status: 500 }
    );
  }
}
