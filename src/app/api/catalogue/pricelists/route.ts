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

    // Fetch all active price lists
    const query = `
      SELECT 
        "priceid" as "priceId",
        "Pricecode" as "code",
        "Descr" as "name",
        "Descr" as "description",
        COALESCE(
          CASE WHEN "Currid" = 1 THEN 'CAD' 
               WHEN "Currid" = 2 THEN 'USD' 
               WHEN "Currid" = 3 THEN 'EUR'
               ELSE 'CAD' 
          END, 
          'CAD'
        ) as "currency",
        "IsActive" as "isActive"
      FROM public."PriceList"
      WHERE "IsActive" = true
      ORDER BY "Descr" ASC
    `;

    const { rows } = await pg.query(query);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET /api/catalogue/pricelists error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des listes de prix" },
      { status: 500 }
    );
  }
}
