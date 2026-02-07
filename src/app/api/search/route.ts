// src/app/api/search/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  }

  const schema = session.user.prextraSchema;
  if (!schema) {
    return NextResponse.json({ ok: false, error: "Aucun schéma Prextra configuré" }, { status: 403 });
  }

  const T = getPrextraTables(schema);
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 25);

  if (!q) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const { rows } = await pg.query(
    `SELECT "ItemId", "ItemCode", "Descr" FROM ${T.ITEMS}
     WHERE "ItemCode" ILIKE $1 OR "Descr" ILIKE $1
     ORDER BY "ItemCode" ASC
     LIMIT $2`,
    [`%${q}%`, limit]
  );

  return NextResponse.json({
    ok: true,
    items: rows.map((i: { ItemId: number; ItemCode: string; Descr: string | null }) => ({
      id: i.ItemId,
      code: i.ItemCode,
      label: i.Descr ?? "",
    })),
  });
}
