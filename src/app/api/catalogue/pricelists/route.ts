import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const schema = session.user.prextraSchema;
    if (!schema) {
      return NextResponse.json({ error: "Aucune donnée ERP pour ce tenant" }, { status: 403 });
    }

    const T = getPrextraTables(schema);

    // Include Pricecodes '01' through '07' from ERP
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
      FROM ${T.PRICE_LIST}
      WHERE "IsActive" = true
        AND "_excludecybercat" = false
        AND "cieid" = '2'
        AND "PriceListType" = 'customer'
        AND "Pricecode" BETWEEN '01' AND '07'
      ORDER BY "Pricecode" ASC
    `;

    const { rows } = await pg.query(query);

    // 08-PDSF: synthetic entry (priceid=17 exists in ERP but is flagged _excludecybercat)
    rows.push({ priceId: 17, code: "08-PDS", name: "PDSF", currency: "CAD" });

    // Custom display order: 01, 04, 05, 02, 03, 07, 06, 08
    const ORDER: Record<string, number> = {
      "01": 1, "04": 2, "05": 3, "02": 4, "03": 5, "07": 6, "06": 7, "08": 8,
    };
    rows.sort((a: { code: string }, b: { code: string }) => {
      const aKey = a.code.trim().substring(0, 2);
      const bKey = b.code.trim().substring(0, 2);
      return (ORDER[aKey] ?? 99) - (ORDER[bKey] ?? 99);
    });

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET /api/catalogue/pricelists error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des listes de prix" },
      { status: 500 }
    );
  }
}
