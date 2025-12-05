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

    // Base query selecting necessary fields from Items table
    // FIXED: Using locitemtype to match itemtype.itemtypeid (not itemsubtypeid)
    let query = `
      SELECT 
        i."ItemId" as "itemId",
        i."ItemCode" as "itemCode",
        i."Descr" as "description",
        i."ProdId" as "prodId",
        i."locitemtype" as "itemTypeId",
        t."descr" as "className",
        p."Name" as "categoryName"
      FROM public."Items" i
      LEFT JOIN public."itemtype" t ON i."locitemtype" = t."itemtypeid"
      LEFT JOIN public."Products" p ON i."ProdId" = p."ProdId"
      WHERE 1=1
        AND i."ProdId" BETWEEN 1 AND 10
    `;
    
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (i."ItemCode" ILIKE $${paramIndex} OR i."Descr" ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
      
      query += ` 
        ORDER BY 
          CASE WHEN i."ItemCode" ILIKE '${search}' THEN 1 
               WHEN i."ItemCode" ILIKE '${search}%' THEN 2 
               WHEN i."Descr" ILIKE '${search}%' THEN 3 
               ELSE 4 
          END,
          i."ItemCode" ASC
        LIMIT 50`; 
    } else if (itemTypeId) {
      // FIXED: Filter by locitemtype (which maps to itemtype.itemtypeid)
      query += ` AND i."locitemtype" = $${paramIndex}`;
      params.push(parseInt(itemTypeId, 10));
      paramIndex++;
      query += ` ORDER BY i."ItemCode" ASC`;
    } else {
      return NextResponse.json({ error: "Paramètres manquants: itemTypeId ou search requis" }, { status: 400 });
    }

    const { rows } = await pg.query(query, params);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET /api/catalogue/items error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des articles" },
      { status: 500 }
    );
  }
}
