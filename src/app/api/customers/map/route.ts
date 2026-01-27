// src/app/api/customers/map/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

// Roles allowed to access map data (case-insensitive)
const ALLOWED_USER_ROLES = [
  "gestionnaire",
];

// Bypass emails (always allowed)
const BYPASS_EMAILS = ["n.labranche@sinto.ca"];

export async function GET(req: Request) {
  // 1) Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const userEmail = user.email;
  const sessionRole = (user.role || "").toLowerCase().trim();

  // 2) Check authorization
  let isAuthorized = ALLOWED_USER_ROLES.includes(sessionRole);
  
  // Special bypass for specific emails
  if (!isAuthorized && userEmail && BYPASS_EMAILS.includes(userEmail.toLowerCase())) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Vous ne disposez pas des autorisations nécessaires." },
      { status: 403 }
    );
  }

  // 3) Parse query params
  const { searchParams } = new URL(req.url);
  const gcieid = Number(searchParams.get("gcieid") ?? 2);
  const salesRep = searchParams.get("salesRep") || null;
  const product = searchParams.get("product") || null;
  const minSales = Number(searchParams.get("minSales") ?? 0);
  
  const endDate = searchParams.get("endDate") ?? new Date().toISOString().slice(0, 10);
  const startDate = searchParams.get("startDate") ?? 
    new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10);

  // 4) Validate dates
  if (
    Number.isNaN(new Date(startDate).getTime()) ||
    Number.isNaN(new Date(endDate).getTime())
  ) {
    return NextResponse.json(
      { error: "Format de date invalide fourni." },
      { status: 400 }
    );
  }

  // 5) Build dynamic SQL query for customer aggregation with location
  // Note: This assumes your Customers table has Latitude and Longitude columns
  // If not, you'll need to add them and geocode addresses
  const SQL_QUERY = `
    WITH CustomerSales AS (
      SELECT
        c."CustId" AS "customerId",
        c."Name" AS "customerName",
        c."Addr1" AS "address",
        c."City" AS "city",
        c."Prov" AS "province",
        c."PCode" AS "postalCode",
        c."Latitude" AS "lat",
        c."Longitude" AS "lng",
        c."Phone" AS "phone",
        sr."Name" AS "salesRepName",
        SUM(d."Amount"::float8) AS "totalSales",
        COUNT(DISTINCT h."invnbr") AS "transactionCount",
        MIN(h."InvDate") AS "firstInvoice",
        MAX(h."InvDate") AS "lastInvoice",
        STRING_AGG(DISTINCT i."ItemCode", ', ') AS "productsPurchased"
      FROM public."InvHeader" h
      JOIN public."Salesrep" sr ON h."srid" = sr."SRId"
      JOIN public."Customers" c ON h."custid" = c."CustId"
      JOIN public."InvDetail" d ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
      JOIN public."Items" i ON d."Itemid" = i."ItemId"
      JOIN public."Products" p ON i."ProdId" = p."ProdId" AND p."CieID" = h."cieid"
      WHERE h."cieid" = $1
        AND h."InvDate" BETWEEN $2 AND $3
        AND sr."Name" <> 'OTOPROTEC (004)'
        AND c."Latitude" IS NOT NULL
        AND c."Longitude" IS NOT NULL
        ${salesRep ? `AND sr."Name" = $4` : ""}
        ${product ? `AND i."ItemCode" = ${salesRep ? "$5" : "$4"}` : ""}
      GROUP BY 
        c."CustId", c."Name", c."Addr1", c."City", c."Prov", c."PCode",
        c."Latitude", c."Longitude", c."Phone", sr."Name"
      HAVING SUM(d."Amount"::float8) >= ${minSales}
    )
    SELECT * FROM CustomerSales
    ORDER BY "totalSales" DESC;
  `;

  // 6) Build params array dynamically
  const params: (string | number)[] = [gcieid, startDate, endDate];
  if (salesRep) params.push(salesRep);
  if (product) params.push(product);

  try {
    const { rows } = await pg.query(SQL_QUERY, params);
    
    // Transform data with computed properties for visualization
    const customers = rows.map((row: any) => ({
      ...row,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      totalSales: parseFloat(row.totalSales),
      pinColor: getPinColor(row.totalSales),
      pinSize: getPinSize(row.totalSales),
    }));

    return NextResponse.json({
      customers,
      total: customers.length,
      filters: {
        salesRep,
        product,
        minSales,
        startDate,
        endDate,
      },
    });
  } catch (error: any) {
    console.error("Database query failed in /api/customers/map:", error);
    return NextResponse.json(
      {
        error: "Échec de la récupération des données.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Color based on sales volume
function getPinColor(totalSales: number): string {
  if (totalSales >= 10000) return "green";
  if (totalSales >= 5000) return "blue";
  if (totalSales >= 2000) return "yellow";
  if (totalSales >= 500) return "orange";
  return "red";
}

// Size based on sales volume
function getPinSize(totalSales: number): string {
  if (totalSales >= 10000) return "xl";
  if (totalSales >= 5000) return "lg";
  if (totalSales >= 2000) return "md";
  return "sm";
}
