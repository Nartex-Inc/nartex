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
    let query = `
      SELECT 
        "ItemId" as "itemId",
        "ItemCode" as "itemCode",
        "Descr" as "description",
        "ProdId" as "prodId",
        "itemsubtypeid" as "itemSubTypeId"
      FROM public."Items"
      WHERE 1=1
        AND "ProdId" BETWEEN 1 AND 10 -- Security restriction
    `;
    
    // explicit typing for query parameters
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      // Search mode: Filter by Code or Description (Case Insensitive)
      // IMPROVED LOGIC: Prioritize matches starting with the search term
      query += ` AND ("ItemCode" ILIKE $${paramIndex} OR "Descr" ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
      
      // Order by relevance: 
      // 1. Exact match on ItemCode
      // 2. Starts with search term on ItemCode
      // 3. Starts with search term on Description
      // 4. Any other match
      query += ` 
        ORDER BY 
          CASE WHEN "ItemCode" ILIKE '${search}' THEN 1 
               WHEN "ItemCode" ILIKE '${search}%' THEN 2 
               WHEN "Descr" ILIKE '${search}%' THEN 3 
               ELSE 4 
          END,
          "ItemCode" ASC
        LIMIT 50`; 
    } else if (itemTypeId) {
      // Hierarchy mode: Filter by SubType (Level 2 -> Level 3 drill down)
      query += ` AND "itemsubtypeid" = $${paramIndex}`;
      params.push(parseInt(itemTypeId, 10));
      paramIndex++;
      query += ` ORDER BY "ItemCode" ASC`;
    } else {
      // If neither search nor itemTypeId is provided, we shouldn't return everything
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
