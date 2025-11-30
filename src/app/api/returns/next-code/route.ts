// src/app/api/returns/next-code/route.ts
// Get next available code_retour - GET

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    // Get max id + 1
    const maxReturn = await prisma.return.findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });

    const nextCode = (maxReturn?.id || 0) + 1;

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
