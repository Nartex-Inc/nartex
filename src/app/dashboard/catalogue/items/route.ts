import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemTypeId = searchParams.get("itemTypeId");
    const search = searchParams.get("search");

    let query = `
      SELECT 
        "ItemId" as "itemId",
        "ItemCode" as "itemCode",
        "Descr" as "description",
        "ProdId" as "prodId",
        "itemsubtypeid" as "itemSubTypeId"
      FROM public."Items"
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (search) {
      // Search mode: Filter by Code or Description
      query += ` AND ("ItemCode" ILIKE $1 OR "Descr" ILIKE $1)`;
      params.push(`%${search}%`);
      query += ` LIMIT 50`; // Limit search results for performance
    } else if (itemTypeId) {
      // Hierarchy mode: Filter by SubType
      query += ` AND "itemsubtypeid" = $1`;
      params.push(parseInt(itemTypeId, 10));
      query += ` ORDER BY "ItemCode" ASC`;
    } else {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const { rows } = await pg.query(query, params);

    // Map rows to ensure strict typing if necessary, though aliases above handle most
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET /api/catalogue/items error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des articles" },
      { status: 500 }
    );
  }
}
