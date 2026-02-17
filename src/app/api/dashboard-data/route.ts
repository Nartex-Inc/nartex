// src/app/api/dashboard-data/route.ts
import { NextResponse } from "next/server";
import { pg } from "@/lib/db";
import prisma from "@/lib/prisma";
import { getPrextraTables } from "@/lib/prextra";
import { requireSchema, normalizeRole, isBypassEmail, getErrorMessage } from "@/lib/auth-helpers";

// Roles allowed to access dashboard data (case-insensitive)
const ALLOWED_USER_ROLES = [
  "gestionnaire",
  "admin",
  "ventes-exec",
  "ventes_exec",
  "facturation",
];

// Roles in user_tenants that grant access
const ALLOWED_TENANT_ROLES = [
  "ventes-exec",
  "ventes_exec",
  "admin",
];

export async function GET(req: Request) {
  // 1) Auth + tenant + schema check
  const auth = await requireSchema();
  if (!auth.ok) return auth.response;
  const { user, schema } = auth;

  const userId = user.id;
  const userEmail = user.email;
  const sessionRole = normalizeRole(user.role);

  // 2) Check if user's session role is allowed
  let isAuthorized = ALLOWED_USER_ROLES.includes(sessionRole);

  // 3) If not authorized by session role, check user_tenants table
  if (!isAuthorized && userId) {
    try {
      const tenantRoles = await prisma.userTenant.findMany({
        where: { userId },
        select: { role: true },
      });

      // Check if any tenant role grants access
      isAuthorized = tenantRoles.some((t: { role: string | null }) =>
        t.role && ALLOWED_TENANT_ROLES.includes(t.role.toLowerCase().trim())
      );
    } catch (err) {
      console.error("Error checking user_tenants:", err);
    }
  }

  // 4) Special bypass for specific emails (safety net)
  if (!isAuthorized && isBypassEmail(userEmail)) {
    isAuthorized = true;
  }

  // 5) Reject if still not authorized
  if (!isAuthorized) {
    console.warn(`[dashboard-data] Access denied for user ${userEmail}, sessionRole=${sessionRole}, userId=${userId}`);
    return NextResponse.json(
      {
        error:
          "Vous ne disposez pas des autorisations nécessaires pour consulter ces données. Veuillez contacter votre département TI pour de l'aide.",
      },
      { status: 403 }
    );
  }

  // 6) Parse query params
  const { searchParams } = new URL(req.url);
  const gcieid = Number(searchParams.get("gcieid") ?? 2);

  const endDate =
    searchParams.get("endDate") ?? new Date().toISOString().slice(0, 10);
  const startDate =
    searchParams.get("startDate") ??
    new Date(new Date().setDate(new Date(endDate).getDate() - 365))
      .toISOString()
      .slice(0, 10);

  // 7) Validate dates
  if (
    Number.isNaN(new Date(startDate).getTime()) ||
    Number.isNaN(new Date(endDate).getTime())
  ) {
    return NextResponse.json(
      { error: "Format de date invalide fourni." },
      { status: 400 }
    );
  }

  // 8) Build and execute query with schema-qualified tables
  const T = getPrextraTables(schema);

  const SQL_QUERY = `
SELECT
  sr."Name"            AS "salesRepName",
  c."Name"             AS "customerName",
  i."ItemCode"         AS "itemCode",
  i."Descr"            AS "itemDescription",
  h."InvDate"          AS "invoiceDate",
  d."Amount"::float8   AS "salesValue"
FROM ${T.INV_HEADER} h
JOIN ${T.SALESREP}   sr ON h."srid"   = sr."SRId"
JOIN ${T.CUSTOMERS}  c  ON h."custid" = c."CustId"
JOIN ${T.INV_DETAIL} d  ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
JOIN ${T.ITEMS}      i  ON d."Itemid" = i."ItemId"
JOIN ${T.PRODUCTS}   p  ON i."ProdId" = p."ProdId" AND p."CieID" = h."cieid"
WHERE h."cieid" = $1
  AND h."InvDate" BETWEEN $2 AND $3
  AND sr."Name" <> 'OTOPROTEC (004)'
  AND NOT (
    CASE
      WHEN btrim(p."ProdCode") ~ '^[0-9]+$'
        THEN (btrim(p."ProdCode")::int > 499)
      ELSE FALSE
    END
  );
`;

  // 9) Check for mode=customers (lightweight distinct query for new-customer lookback)
  const mode = searchParams.get("mode");

  if (mode === "customers") {
    const CUSTOMERS_QUERY = `
SELECT DISTINCT c."Name" AS "customerName"
FROM ${T.INV_HEADER} h
JOIN ${T.SALESREP}   sr ON h."srid"   = sr."SRId"
JOIN ${T.CUSTOMERS}  c  ON h."custid" = c."CustId"
JOIN ${T.INV_DETAIL} d  ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
JOIN ${T.ITEMS}      i  ON d."Itemid" = i."ItemId"
JOIN ${T.PRODUCTS}   p  ON i."ProdId" = p."ProdId" AND p."CieID" = h."cieid"
WHERE h."cieid" = $1
  AND h."InvDate" BETWEEN $2 AND $3
  AND sr."Name" <> 'OTOPROTEC (004)'
  AND NOT (
    CASE
      WHEN btrim(p."ProdCode") ~ '^[0-9]+$'
        THEN (btrim(p."ProdCode")::int > 499)
      ELSE FALSE
    END
  );
`;
    try {
      const params: [number, string, string] = [gcieid, startDate, endDate];
      const { rows } = await pg.query(CUSTOMERS_QUERY, params);
      return NextResponse.json({
        customers: rows.map((r: { customerName: string }) => r.customerName),
      });
    } catch (error: unknown) {
      console.error("Database query failed in /api/dashboard-data (mode=customers):", error);
      return NextResponse.json(
        {
          error: "Échec de la récupération des données du tableau de bord.",
          details: getErrorMessage(error),
        },
        { status: 500 }
      );
    }
  }

  if (mode === "summary") {
    const SUMMARY_QUERY = `
SELECT
  sr."Name"                        AS "salesRepName",
  c."Name"                         AS "customerName",
  i."ItemCode"                     AS "itemCode",
  to_char(h."InvDate", 'YYYY-MM') AS "invoiceDate",
  MIN(h."InvDate")::text           AS "firstDate",
  SUM(d."Amount")::float8          AS "salesValue",
  COUNT(*)::int                    AS "txCount"
FROM ${T.INV_HEADER} h
JOIN ${T.SALESREP}   sr ON h."srid"   = sr."SRId"
JOIN ${T.CUSTOMERS}  c  ON h."custid" = c."CustId"
JOIN ${T.INV_DETAIL} d  ON h."invnbr" = d."invnbr" AND h."cieid" = d."cieid"
JOIN ${T.ITEMS}      i  ON d."Itemid" = i."ItemId"
JOIN ${T.PRODUCTS}   p  ON i."ProdId" = p."ProdId" AND p."CieID" = h."cieid"
WHERE h."cieid" = $1
  AND h."InvDate" BETWEEN $2 AND $3
  AND sr."Name" <> 'OTOPROTEC (004)'
  AND NOT (
    CASE
      WHEN btrim(p."ProdCode") ~ '^[0-9]+$'
        THEN (btrim(p."ProdCode")::int > 499)
      ELSE FALSE
    END
  )
GROUP BY sr."Name", c."Name", i."ItemCode", to_char(h."InvDate", 'YYYY-MM');
`;
    try {
      const params: [number, string, string] = [gcieid, startDate, endDate];
      const { rows } = await pg.query(SUMMARY_QUERY, params);
      return NextResponse.json(rows);
    } catch (error: unknown) {
      console.error("Database query failed in /api/dashboard-data (mode=summary):", error);
      return NextResponse.json(
        {
          error: "Échec de la récupération des données du tableau de bord.",
          details: getErrorMessage(error),
        },
        { status: 500 }
      );
    }
  }

  try {
    const params: [number, string, string] = [gcieid, startDate, endDate];
    const { rows } = await pg.query(SQL_QUERY, params);
    return NextResponse.json(rows);
  } catch (error: unknown) {
    console.error("Database query failed in /api/dashboard-data:", error);
    return NextResponse.json(
      {
        error: "Échec de la récupération des données du tableau de bord.",
        details: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
