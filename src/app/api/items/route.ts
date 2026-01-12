// src/app/api/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim(); // Frontend sends 'q'
    const code = (searchParams.get("code") || "").trim(); // Frontend might send 'code' for single item lookup

    // 1. Single Item Lookup (for getItem)
    if (code) {
      const item = await prisma.items.findFirst({
        where: { itemcode: code },
        select: { itemcode: true, descr: true },
      });

      if (!item) {
        return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        item: {
          code: item.itemcode,
          descr: item.descr,
          weight: 0, // Placeholder if weight isn't in DB
        },
      });
    }

    // 2. Search Suggestions (for searchItems)
    if (q) {
      const items = await prisma.items.findMany({
        where: {
          OR: [
            { itemcode: { contains: q, mode: "insensitive" } },
            { descr: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { itemcode: true, descr: true },
        take: 20,
        orderBy: { itemcode: "asc" },
      });

      return NextResponse.json({
        ok: true,
        suggestions: items.map((i) => ({
          code: i.itemcode,
          descr: i.descr,
        })),
      });
    }

    return NextResponse.json({ ok: false, error: "Missing parameters" }, { status: 400 });

  } catch (error: any) {
    console.error("GET /api/items error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
