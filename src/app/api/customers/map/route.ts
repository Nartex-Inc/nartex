// src/app/api/customers/map/route.ts
// Uses Google Geocoding API only - ALWAYS geocodes fresh, saves to database

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pg } from "@/lib/db";

// Roles allowed to access map data
const ALLOWED_USER_ROLES = [
  "gestionnaire",
  "admin",
  "ventes-exec",
  "ventes_exec",
  "facturation",
  "expert",
];

const BYPASS_EMAILS = ["n.labranche@sinto.ca"];

/**
 * Geocode an address using Google Geocoding API
 */
const GEOCODE_BATCH_LIMIT = 100; // Max geocodes per request
let geocodeCount = 0;

async function geocodeAddress(
  address: string,
  city: string,
  postalCode: string
): Promise<string | null> {
  if (geocodeCount >= GEOCODE_BATCH_LIMIT) {
    console.warn(`⚠️ Geocode limit reached (${GEOCODE_BATCH_LIMIT})`);
    return null;
  }
  
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("❌ GOOGLE_MAPS_API_KEY not set, skipping geocoding");
    return null;
  }

  const fullAddress = [address, city, "QC", postalCode, "Canada"]
    .filter(Boolean)
    .join(", ");

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      geocodeCount++;
      const loc = data.results[0].geometry.location;
      console.log(`✅ [${geocodeCount}] Geocoded: ${city} → ${loc.lat},${loc.lng}`);
      return `${loc.lat},${loc.lng}`;
    }
    console.warn(`❌ Geocoding failed for: ${fullAddress} (${data.status})`);
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Save geoLocation to database
 */
async function saveGeoLocation(custId: number, geoLocation: string): Promise<void> {
  try {
    await pg.query(
      `UPDATE public."Customers" SET "geoLocation" = $1 WHERE "CustId" = $2`,
      [geoLocation, custId]
    );
  } catch (error) {
    console.error(`Failed to save geoLocation for customer ${custId}:`, error);
  }
}

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
  const productsParam = searchParams.get("products") || null;
  const products = productsParam ? productsParam.split(",").filter(Boolean) : [];
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

  // 5) Build SQL query
  let paramIndex = 4;
  const conditions: string[] = [];
  const params: (string | number)[] = [gcieid, startDate, endDate];

  if (salesRep) {
    conditions.push(`sr."Name" = $${paramIndex}`);
    params.push(salesRep);
    paramIndex++;
  }

  if (products.length > 0) {
    const placeholders = products.map((_, idx) => `$${paramIndex + idx}`).join(", ");
    conditions.push(`i."ItemCode" IN (${placeholders})`);
    params.push(...products);
    paramIndex += products.length;
  }

  const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

  const SQL_QUERY = `
    SELECT
      c."CustId" AS "customerId",
      c."Name" AS "customerName",
      c."Line1" AS "address",
      c."City" AS "city",
      c."ZipCode" AS "postalCode",
      c."tel" AS "phone",
      c."geoLocation" AS "geoLocation",
      sr."Name" AS "salesRepName",
      SUM(d."Amount"::float8) AS "totalSales",
      COUNT(DISTINCT h."invnbr") AS "transactionCount",
      MIN(h."InvDate") AS "firstInvoice",
      MAX(h."InvDate") AS "lastInvoice",
      STRING_AGG(DISTINCT i."ItemCode", ', ' ORDER BY i."ItemCode") AS "productsPurchased"
    FROM public."InvHeader" h
    JOIN public."Salesrep" sr ON h."srid" = sr."SRId"
    JOIN public."Customers" c ON h."custid" = c."CustId"
    JOIN public."InvDetail" d ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
    JOIN public."Items" i ON d."Itemid" = i."ItemId"
    JOIN public."Products" p ON i."ProdId" = p."ProdId" AND p."CieID" = h."cieid"
    WHERE h."cieid" = $1
      AND h."InvDate" BETWEEN $2 AND $3
      AND sr."Name" <> 'OTOPROTEC (004)'
      AND c."Line1" IS NOT NULL
      AND c."Line1" <> ''
      AND c."City" IS NOT NULL
      AND c."City" <> ''
      ${whereClause}
    GROUP BY 
      c."CustId", c."Name", c."Line1", c."City", c."ZipCode",
      c."tel", c."geoLocation", sr."Name"
    HAVING SUM(d."Amount"::float8) >= ${minSales}
    ORDER BY SUM(d."Amount"::float8) DESC;
  `;

  try {
    // Reset geocode counter for this request
    geocodeCount = 0;
    
    const { rows } = await pg.query(SQL_QUERY, params);
    
    console.log(`📍 Processing ${rows.length} customers...`);
    
    // DEBUG: Log first 3 customers to see what data we have
    const debugInfo: any[] = [];
    
    // Transform data - use existing geoLocation OR geocode if missing
    const customersPromises = rows.map(async (row: any, index: number) => {
      let lat: number | null = null;
      let lng: number | null = null;
      let wasGeocoded = false;
      let skipReason = "";

      // DEBUG: Capture first 5 customers' data
      if (index < 5) {
        debugInfo.push({
          name: row.customerName,
          address: row.address,
          city: row.city,
          geoLocation: row.geoLocation,
          geoLocationType: typeof row.geoLocation,
          geoLocationLength: row.geoLocation?.length,
        });
      }

      // 1. First check existing geoLocation in database
      if (row.geoLocation && row.geoLocation.trim() !== "") {
        const geoStr = String(row.geoLocation).trim();
        const parts = geoStr.split(",");
        if (parts.length === 2) {
          const parsedLat = parseFloat(parts[0].trim());
          const parsedLng = parseFloat(parts[1].trim());
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            lat = parsedLat;
            lng = parsedLng;
          } else {
            skipReason = `Invalid lat/lng: ${parts[0]}, ${parts[1]}`;
          }
        } else {
          skipReason = `geoLocation not in lat,lng format: "${geoStr}"`;
        }
      } else {
        skipReason = `No geoLocation (value: "${row.geoLocation}")`;
      }

      // 2. If no valid geoLocation, try to geocode
      if (lat === null || lng === null) {
        const geoResult = await geocodeAddress(row.address, row.city, row.postalCode);
        if (geoResult) {
          const parts = geoResult.split(",");
          lat = parseFloat(parts[0]);
          lng = parseFloat(parts[1]);
          wasGeocoded = true;
          skipReason = "";
          // Save to database for future use
          saveGeoLocation(row.customerId, geoResult);
        } else {
          if (index < 5) {
            console.log(`❌ Skipping ${row.customerName}: ${skipReason}, geocoding also failed`);
          }
        }
      }
      
      // Skip if no location data at all
      if (lat === null || lng === null) {
        return null;
      }

      const totalSales = parseFloat(row.totalSales);

      return {
        customerId: row.customerId,
        customerName: row.customerName,
        address: row.address,
        city: row.city,
        postalCode: row.postalCode,
        phone: row.phone,
        salesRepName: row.salesRepName,
        totalSales,
        transactionCount: parseInt(row.transactionCount, 10),
        firstInvoice: row.firstInvoice,
        lastInvoice: row.lastInvoice,
        productsPurchased: row.productsPurchased,
        lat,
        lng,
        pinColor: getPinColor(totalSales),
        pinSize: getPinSize(totalSales),
      };
    });

    const customersResolved = await Promise.all(customersPromises);
    const customers = customersResolved.filter(Boolean);

    console.log(`✅ Geocoded ${geocodeCount} customers, ${rows.length - customers.length} skipped`);
    console.log(`🔍 Debug sample:`, JSON.stringify(debugInfo, null, 2));

    return NextResponse.json({
      customers,
      total: customers.length,
      geocodedThisRequest: geocodeCount,
      skipped: rows.length - customers.length,
      debug: debugInfo, // Include debug info in response
      filters: {
        salesRep,
        products,
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
