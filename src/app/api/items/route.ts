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
    const q = (searchParams.get("q") || "").trim();
    const code = (searchParams.get("code") || "").trim();

    // 1. Single Item Lookup (Exact code)
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
          weight: 0,
        },
      });
    }

    // 2. Search Suggestions (with Smart Sorting)
    if (q) {
      // Fetch a slightly larger batch to ensure we capture the exact match even if not alphabetically first
      const items = await prisma.items.findMany({
        where: {
          OR: [
            { itemcode: { contains: q, mode: "insensitive" } },
            { descr: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { itemcode: true, descr: true },
        take: 50, // Increase limit to allow for sorting
      });

      // --- SMART SORTING LOGIC ---
      const searchUpper = q.toUpperCase();
      
      items.sort((a, b) => {
        const codeA = a.itemcode.toUpperCase();
        const codeB = b.itemcode.toUpperCase();
        const descA = (a.descr || "").toUpperCase();
        const descB = (b.descr || "").toUpperCase();

        // Priority 1: Exact Code Match
        if (codeA === searchUpper && codeB !== searchUpper) return -1;
        if (codeB === searchUpper && codeA !== searchUpper) return 1;

        // Priority 2: Code Starts With Query
        const startA = codeA.startsWith(searchUpper);
        const startB = codeB.startsWith(searchUpper);
        if (startA && !startB) return -1;
        if (startB && !startA) return 1;

        // Priority 3: Code Contains Query (vs Description only)
        const inCodeA = codeA.includes(searchUpper);
        const inCodeB = codeB.includes(searchUpper);
        if (inCodeA && !inCodeB) return -1;
        if (inCodeB && !inCodeA) return 1;

        // Priority 4: Alphabetical (fallback)
        return codeA.localeCompare(codeB);
      });

      // Slice to original limit of 20 after sorting
      const topItems = items.slice(0, 20);

      return NextResponse.json({
        ok: true,
        suggestions: topItems.map((i) => ({
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
