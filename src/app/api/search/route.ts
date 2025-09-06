// src/app/api/search/route.ts
// ✅ Use default prisma import and Web Request type for App Router

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 25);

  if (!q) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const items = await prisma.items.findMany({
    where: {
      OR: [
        { itemcode: { contains: q, mode: "insensitive" } },
        { descr: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { itemid: true, itemcode: true, descr: true },
    take: limit,
    orderBy: [{ itemcode: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    items: items.map((i) => ({
      id: i.itemid,
      code: i.itemcode,
      label: i.descr ?? "",
    })),
  });
}
