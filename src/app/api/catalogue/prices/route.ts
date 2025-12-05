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
    const priceId = searchParams.get("priceId");
    const prodId = searchParams.get("prodId");
    const typeId = searchParams.get("typeId");
    const itemId = searchParams.get("itemId");

    if (!priceId || !prodId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Enhanced query with NetWeight as UDM (units per case/box)
    let query = `
      SELECT 
        i."ItemId" as "itemId",
        i."ItemCode" as "itemCode",
        i."Descr" as "description",
        i."NetWeight" as "format",
        i."NetWeight" as "udm",
        p."Name" as "categoryName",
        t."descr" as "className",
        ipr."fromqty" as "qtyMin",
        ipr."price" as "unitPrice",
        ipr."itempricerangeid" as "id",
        pl."Descr" as "priceListName",
        pl."Pricecode" as "priceCode",
        COALESCE(
          CASE WHEN pl."Currid" = 1 THEN 'CAD' 
               WHEN pl."Currid" = 2 THEN 'USD' 
               ELSE 'CAD' 
          END, 
          'CAD'
        ) as "currency"
      FROM public."itempricerange" ipr
      INNER JOIN public."Items" i ON ipr."itemid" = i."ItemId"
      INNER JOIN public."PriceList" pl ON ipr."priceid" = pl."priceid"
      LEFT JOIN public."Products" p ON i."ProdId" = p."ProdId"
      LEFT JOIN public."itemtype" t ON i."locitemtype" = t."itemtypeid"
      WHERE pl."priceid" = $1 
        AND pl."IsActive" = true
        AND i."ProdId" = $2
        AND ipr."itempricedateid" = (
            SELECT MAX(ipr2."itempricedateid")
            FROM public."itempricerange" ipr2
            WHERE ipr2."itemid" = ipr."itemid" 
              AND ipr2."priceid" = ipr."priceid"
              AND ipr2."fromqty" = ipr."fromqty"
        )
    `;

    const params: any[] = [parseInt(priceId, 10), parseInt(prodId, 10)];
    let paramIdx = 3;

    if (itemId) {
      query += ` AND i."ItemId" = $${paramIdx}`;
      params.push(parseInt(itemId, 10));
      paramIdx++;
    } else if (typeId) {
      // FIXED: Use locitemtype for filtering
      query += ` AND i."locitemtype" = $${paramIdx}`;
      params.push(parseInt(typeId, 10));
      paramIdx++;
    }

    query += ` ORDER BY i."ItemCode" ASC, ipr."fromqty" ASC`;

    const { rows } = await pg.query(query, params);

    // Group by item with enhanced data structure
    const itemsMap: Record<number, any> = {};
    
    for (const row of rows) {
       if (!itemsMap[row.itemId]) {
          itemsMap[row.itemId] = {
             itemId: row.itemId,
             itemCode: row.itemCode,
             description: row.description,
             format: row.format,
             udm: row.udm || 'UN',
             categoryName: row.categoryName,
             className: row.className,
             priceListName: row.priceListName,
             priceCode: row.priceCode,
             currency: row.currency,
             ranges: []
          };
       }
       itemsMap[row.itemId].ranges.push({
          id: row.id,
          qtyMin: parseInt(row.qtyMin),
          unitPrice: parseFloat(row.unitPrice)
       });
    }

    return NextResponse.json(Object.values(itemsMap));
    
  } catch (error: any) {
    console.error("Prices API error:", error);
    return NextResponse.json({ error: "Erreur génération" }, { status: 500 });
  }
}
