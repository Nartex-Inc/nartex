// src/app/api/prextra/experts/route.ts
// Get list of sales representatives (experts) - GET

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { getExperts } from "@/lib/prextra";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const experts = await getExperts();

    return NextResponse.json({ ok: true, experts });
  } catch (error) {
    console.error("GET /api/prextra/experts error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des experts" },
      { status: 500 }
    );
  }
}
