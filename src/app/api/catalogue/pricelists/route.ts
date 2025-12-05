import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // STRICT filtering as requested by your manager: 
    // 1. Active lists only
    // 2. cieid = 2
    // 3. Customer lists only
    // 4. Pricecode explicitly between '01' and '08' (inclusive) to remove internal/junk codes
    const query = `
      SELECT 
        "priceid" as "priceId",
        "Pricecode" as "code",
        "Descr" as "name",
        COALESCE(
          CASE WHEN "Currid" = 1 THEN 'CAD' 
               WHEN "Currid" = 2 THEN 'USD' 
               ELSE 'CAD' 
          END, 
          'CAD'
        ) as "currency"
      FROM public."PriceList"
      WHERE "IsActive" = true
        AND "cieid" = 2
        AND "PriceListType" = 'customer'
        AND "Pricecode" BETWEEN '01' AND '08'
      ORDER BY "Pricecode" ASC
    `;

    const { rows } = await pg.query(query);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET /api/catalogue/pricelists error:", error);
    return NextResponse.json({ error: "Erreur liste de prix" }, { status: 500 });
  }
}
