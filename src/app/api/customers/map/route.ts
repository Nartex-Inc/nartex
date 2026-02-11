// src/app/api/customers/map/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";
import { getPrextraTables } from "@/lib/prextra";
import prisma from "@/lib/prisma";

const GOOGLE_MAPS_API_KEY = "AIzaSyAYT0oFzSGe2IAoivqG2Reb-1IKOW4URjs";

const ALLOWED_USER_ROLES = ["gestionnaire", "admin", "ventes-exec", "ventes_exec", "facturation", "expert"];
const BYPASS_EMAILS = ["n.labranche@sinto.ca"];

let geocodeCount = 0;
const GEOCODE_LIMIT = 100; // Max new geocodes per request
const geocodeErrors: string[] = [];

async function geocode(address: string, city: string, postalCode: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCount >= GEOCODE_LIMIT) return null;

  const fullAddress = `${address}, ${city}, QC ${postalCode}, Canada`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
      geocodeCount++;
      const { lat, lng } = data.results[0].geometry.location;
      console.log(`[${geocodeCount}] ${city} -> ${lat.toFixed(4)},${lng.toFixed(4)}`);
      return { lat, lng };
    } else {
      const errorMsg = `${city}: ${data.status} - ${data.error_message || 'no error message'}`;
      geocodeErrors.push(errorMsg);
      console.log(`FAILED: ${errorMsg}`);
      return null;
    }
  } catch (err: any) {
    const errorMsg = `${city}: FETCH ERROR - ${err.message}`;
    geocodeErrors.push(errorMsg);
    console.log(`ERROR: ${errorMsg}`);
    return null;
  }
}

async function saveGeo(tenantSlug: string, custId: number, lat: number, lng: number, address: string): Promise<boolean> {
  try {
    await prisma.customerGeoCache.upsert({
      where: { tenantSlug_custId: { tenantSlug, custId } },
      create: { tenantSlug, custId, lat, lng, address },
      update: { lat, lng, address },
    });
    console.log(`Saved to DB: customer ${custId}`);
    return true;
  } catch (e: any) {
    console.log(`DB Save failed: ${custId} - ${e.message}`);
    return false;
  }
}

function getPinColor(sales: number): string {
  if (sales >= 10000) return "green";
  if (sales >= 5000) return "blue";
  if (sales >= 2000) return "yellow";
  if (sales >= 500) return "orange";
  return "red";
}

function getPinSize(sales: number): string {
  if (sales >= 10000) return "xl";
  if (sales >= 5000) return "lg";
  if (sales >= 2000) return "md";
  return "sm";
}

export async function GET(req: Request) {
  // Auth
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const role = (user.role || "").toLowerCase().trim();
  const email = user.email?.toLowerCase() || "";

  if (!ALLOWED_USER_ROLES.includes(role) && !BYPASS_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schema = user.prextraSchema;
  if (!schema) {
    return NextResponse.json({ error: "Aucune donnée ERP pour ce tenant" }, { status: 403 });
  }

  const T = getPrextraTables(schema);

  // Parse params
  const { searchParams } = new URL(req.url);
  const gcieid = Number(searchParams.get("gcieid") ?? 2);
  const salesRep = searchParams.get("salesRep") || null;
  const productsParam = searchParams.get("products") || null;
  const products = productsParam ? productsParam.split(",").filter(Boolean) : [];
  const minSales = Number(searchParams.get("minSales") ?? 0);
  const startDate = searchParams.get("startDate") ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const endDate = searchParams.get("endDate") ?? new Date().toISOString().slice(0, 10);

  // Build query
  let paramIndex = 4;
  const conditions: string[] = [];
  const params: any[] = [gcieid, startDate, endDate];

  if (salesRep) {
    conditions.push(`sr."Name" = $${paramIndex++}`);
    params.push(salesRep);
  }

  if (products.length > 0) {
    const ph = products.map(() => `$${paramIndex++}`).join(", ");
    conditions.push(`i."ItemCode" IN (${ph})`);
    params.push(...products);
  }

  const where = conditions.length ? `AND ${conditions.join(" AND ")}` : "";

  const SQL = `
    SELECT
      c."CustId" AS id,
      c."Name" AS name,
      c."Line1" AS address,
      c."City" AS city,
      c."ZipCode" AS postal,
      c."tel" AS phone,
      sr."Name" AS rep,
      SUM(d."Amount"::float8) AS sales,
      COUNT(DISTINCT h."invnbr") AS txns,
      MAX(h."InvDate") AS lastInv,
      STRING_AGG(DISTINCT i."ItemCode", ', ' ORDER BY i."ItemCode") AS products
    FROM ${T.INV_HEADER} h
    JOIN ${T.SALESREP} sr ON h."srid" = sr."SRId"
    JOIN ${T.CUSTOMERS} c ON h."custid" = c."CustId"
    JOIN ${T.INV_DETAIL} d ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
    JOIN ${T.ITEMS} i ON d."Itemid" = i."ItemId"
    JOIN ${T.PRODUCTS} p ON i."ProdId" = p."ProdId" AND p."CieID" = h."cieid"
    WHERE h."cieid" = $1
      AND h."InvDate" BETWEEN $2 AND $3
      AND sr."Name" <> 'OTOPROTEC (004)'
      AND c."Line1" IS NOT NULL AND c."Line1" <> ''
      AND c."City" IS NOT NULL AND c."City" <> ''
      ${where}
    GROUP BY c."CustId", c."Name", c."Line1", c."City", c."ZipCode", c."tel", sr."Name"
    HAVING SUM(d."Amount"::float8) >= ${minSales}
    ORDER BY SUM(d."Amount"::float8) DESC;
  `;

  try {
    geocodeCount = 0;
    geocodeErrors.length = 0; // Reset errors
    const { rows } = await pg.query(SQL, params);

    console.log(`\nMAP API: Processing ${rows.length} customers`);

    // Batch-fetch all cached geo entries for these customers
    const custIds = rows.map((r: any) => r.id as number);
    const cached = await prisma.customerGeoCache.findMany({
      where: { tenantSlug: schema, custId: { in: custIds } },
    });
    const cacheMap = new Map(cached.map(c => [c.custId, c]));

    const customers: any[] = [];
    const errors: string[] = [];
    let cachedCount = 0;
    let savedCount = 0;

    for (const row of rows) {
      let lat: number | null = null;
      let lng: number | null = null;

      const rowAddress = `${row.address}, ${row.city}`;
      const hit = cacheMap.get(row.id);

      if (hit && hit.address === rowAddress) {
        // Cache hit — address unchanged
        lat = hit.lat;
        lng = hit.lng;
        cachedCount++;
      } else {
        // Cache miss or address changed — geocode
        const result = await geocode(row.address, row.city, row.postal || "");
        if (result) {
          lat = result.lat;
          lng = result.lng;
          const saved = await saveGeo(schema, row.id, lat, lng, rowAddress);
          if (saved) savedCount++;
        } else {
          errors.push(row.name);
          continue;
        }
      }

      customers.push({
        customerId: row.id,
        customerName: row.name,
        address: row.address,
        city: row.city,
        postalCode: row.postal,
        phone: row.phone,
        salesRepName: row.rep,
        totalSales: parseFloat(row.sales),
        transactionCount: parseInt(row.txns),
        lastInvoice: row.lastInv,
        productsPurchased: row.products,
        lat,
        lng,
        pinColor: getPinColor(parseFloat(row.sales)),
        pinSize: getPinSize(parseFloat(row.sales)),
      });
    }

    console.log(`Done: ${customers.length} total | ${cachedCount} cached | ${geocodeCount} geocoded | ${savedCount} saved | ${errors.length} failed\n`);

    return NextResponse.json({
      customers,
      total: customers.length,
      fromCache: cachedCount,
      geocodedThisRequest: geocodeCount,
      savedToDb: savedCount,
      skipped: errors.length,
      filters: { salesRep, products, minSales, startDate, endDate },
    });

  } catch (error: any) {
    console.error("DB Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
