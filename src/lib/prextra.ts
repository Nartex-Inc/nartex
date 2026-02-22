// src/lib/prextra.ts
// Helper functions for querying Prextra replicated tables
// Uses raw pg pool because DMS creates case-sensitive quoted column names

import { pg } from "./db";

/* =============================================================================
   Prextra Table References (DMS-replicated with quoted identifiers)
   Each tenant's tables live in a dedicated schema (e.g. "sinto", "prolab").
============================================================================= */

/**
 * Returns schema-qualified table names for Prextra ERP queries.
 * Every schema gets the `"schema".` prefix uniformly.
 */
export function getPrextraTables(schema: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid Prextra schema name: "${schema}"`);
  }
  const s = `"${schema}".`;
  return {
    ITEMS: `${s}"Items"`,
    CUSTOMERS: `${s}"Customers"`,
    SO_HEADER: `${s}"SOHeader"`,
    SALESREP: `${s}"Salesrep"`,
    SITES: `${s}"Sites"`,
    CARRIERS: `${s}"carriers"`,
    SHIPMENT_HDR: `${s}"ShipmentHdr"`,
    INV_HEADER: `${s}"InvHeader"`,
    INV_DETAIL: `${s}"InvDetail"`,
    SHIPTO: `${s}"Shipto"`,
    CITY: `${s}"_City"`,
    CITY_SETTING: `${s}"_CitySetting"`,
    TRANSPORT_CHART: `${s}"_TransportChartDTL"`,
    PRODUCTS: `${s}"Products"`,
    ITEM_TYPE: `${s}"itemtype"`,
    PRICE_LIST: `${s}"PriceList"`,
    ITEM_PRICE_RANGE: `${s}"itempricerange"`,
    RECORD_SPEC_DATA: `${s}"RecordSpecData"`,
    DISCOUNT_MAINTENANCE_HDR: `${s}"_DiscountMaintenanceHdr"`,
    ZDATANAME: `${s}"zdataname"`,
  } as const;
}

export type PrextraTables = ReturnType<typeof getPrextraTables>;

/* =============================================================================
   Query Helpers
============================================================================= */

/**
 * Execute a query against the Prextra replicated tables
 */
export async function queryPrextra<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pg.query(text, params);
  return result.rows as T[];
}

/* =============================================================================
   Experts (Sales Reps)
============================================================================= */

export async function getExperts(schema: string): Promise<string[]> {
  const T = getPrextraTables(schema);
  const result = await queryPrextra<{ Name: string }>(
    `SELECT DISTINCT "Name" FROM ${T.SALESREP}
     WHERE "Name" IS NOT NULL AND "Name" != ''
     ORDER BY "Name" ASC`
  );
  return result.map((r) => r.Name);
}

/* =============================================================================
   Sites (Warehouses)
============================================================================= */

export async function getSites(schema: string): Promise<string[]> {
  const T = getPrextraTables(schema);
  const result = await queryPrextra<{ Name: string }>(
    `SELECT "Name" FROM ${T.SITES}
     WHERE "Name" IS NOT NULL AND "Name" != ''
     ORDER BY "Name" ASC`
  );
  return result.map((r) => r.Name);
}

/* =============================================================================
   Order Lookup
============================================================================= */

export interface OrderLookupResult {
  sonbr: string;
  OrderDate: Date | null;
  totalamt: number | null;
  customerName: string | null;
  custCode: string | null;
  carrierName: string | null;
  salesrepName: string | null;
  tracking: string | null;
}

export async function lookupOrder(noCommande: string, schema: string): Promise<OrderLookupResult | null> {
  const T = getPrextraTables(schema);
  const result = await queryPrextra<OrderLookupResult>(
    `SELECT
      so."sonbr"::text as "sonbr",
      so."OrderDate",
      so."totalamt",
      c."Name" AS "customerName",
      c."CustCode" AS "custCode",
      ca."name" AS "carrierName",
      sr."Name" AS "salesrepName",
      sh."WayBill" AS "tracking"
     FROM ${T.SO_HEADER} so
     LEFT JOIN ${T.CUSTOMERS} c ON so."custid" = c."CustId"
     LEFT JOIN ${T.CARRIERS} ca ON so."Carrid" = ca."carrid"
     LEFT JOIN ${T.SALESREP} sr ON so."SRid" = sr."SRId"
     LEFT JOIN ${T.SHIPMENT_HDR} sh ON so."sonbr" = sh."sonbr"
     WHERE so."sonbr"::text = $1
     LIMIT 1`,
    [noCommande]
  );

  return result.length > 0 ? result[0] : null;
}

/* =============================================================================
   Item Search
============================================================================= */

export interface ItemSearchResult {
  ItemCode: string;
  Descr: string | null;
  ShipWeight: number | null;
}

export async function searchItems(query: string, schema: string, limit = 10): Promise<ItemSearchResult[]> {
  if (query.length < 2) return [];
  const T = getPrextraTables(schema);

  return queryPrextra<ItemSearchResult>(
    `SELECT "ItemCode", "Descr", "ShipWeight"
     FROM ${T.ITEMS}
     WHERE "ItemCode" ILIKE $1
     ORDER BY "ItemCode" ASC
     LIMIT $2`,
    [`${query}%`, limit]
  );
}

export async function getItemByCode(code: string, schema: string): Promise<ItemSearchResult | null> {
  const T = getPrextraTables(schema);
  const result = await queryPrextra<ItemSearchResult>(
    `SELECT "ItemCode", "Descr", "ShipWeight"
     FROM ${T.ITEMS}
     WHERE "ItemCode" = $1
     LIMIT 1`,
    [code]
  );
  return result.length > 0 ? result[0] : null;
}

/* =============================================================================
   City / Transport Zone Lookup
============================================================================= */

export interface CityZoneResult {
  City: string;
  _Code: string;
}

export async function getCityAndZone(sonbr: string, schema: string): Promise<CityZoneResult | null> {
  const T = getPrextraTables(schema);
  const result = await queryPrextra<CityZoneResult>(
    `SELECT
      shipto."City",
      tc."_Code"
     FROM ${T.INV_HEADER} inv
     INNER JOIN ${T.SHIPTO} shipto ON inv."shiptoid" = shipto."ShipToId"
     INNER JOIN ${T.CITY} city ON shipto."City" = city."_Name"
     INNER JOIN ${T.CITY_SETTING} cs ON city."_cityid" = cs."_CityId"
     INNER JOIN ${T.TRANSPORT_CHART} tc ON cs."_ChartDtlId" = tc."_ChartDtlid"
     WHERE inv."SoNbr"::text = $1
     LIMIT 1`,
    [sonbr]
  );
  return result.length > 0 ? result[0] : null;
}

/**
 * Debug helper: check each table in the city/zone join chain individually.
 * Returns diagnostics about which tables exist, have data, and where the join breaks.
 */
export async function debugCityZone(sonbr: string, schema: string) {
  const T = getPrextraTables(schema);
  const diag: Record<string, unknown> = { schema, sonbr, tables: {} };

  // 1. Check InvHeader — list actual columns first, then try query
  try {
    const cols = await queryPrextra<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'InvHeader'
       ORDER BY ordinal_position`,
      [schema]
    );
    const inv = cols.length > 0
      ? await queryPrextra<Record<string, unknown>>(
          `SELECT * FROM ${T.INV_HEADER} LIMIT 1`
        )
      : [];
    diag.tables = { ...diag.tables as object, InvHeader: { ok: true, columns: cols.map(c => c.column_name), sample: inv[0] ?? null } };
  } catch (e) {
    diag.tables = { ...diag.tables as object, InvHeader: { ok: false, error: String(e) } };
  }

  // 2. Check Shipto table exists + row count sample
  try {
    const sh = await queryPrextra<Record<string, unknown>>(
      `SELECT "ShipToId", "City" FROM ${T.SHIPTO} LIMIT 3`
    );
    diag.tables = { ...diag.tables as object, Shipto: { ok: true, sampleRows: sh } };
  } catch (e) {
    diag.tables = { ...diag.tables as object, Shipto: { ok: false, error: String(e) } };
  }

  // 3. Check _City
  try {
    const ct = await queryPrextra<Record<string, unknown>>(
      `SELECT "_cityid", "_Name" FROM ${T.CITY} LIMIT 3`
    );
    diag.tables = { ...diag.tables as object, _City: { ok: true, sampleRows: ct } };
  } catch (e) {
    diag.tables = { ...diag.tables as object, _City: { ok: false, error: String(e) } };
  }

  // 4. Check _CitySetting
  try {
    const cs = await queryPrextra<Record<string, unknown>>(
      `SELECT "_CityId", "_ChartDtlId" FROM ${T.CITY_SETTING} LIMIT 3`
    );
    diag.tables = { ...diag.tables as object, _CitySetting: { ok: true, sampleRows: cs } };
  } catch (e) {
    diag.tables = { ...diag.tables as object, _CitySetting: { ok: false, error: String(e) } };
  }

  // 5. Check _TransportChartDTL — list actual columns first
  try {
    const cols = await queryPrextra<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = '_TransportChartDTL'
       ORDER BY ordinal_position`,
      [schema]
    );
    const tc = cols.length > 0
      ? await queryPrextra<Record<string, unknown>>(
          `SELECT * FROM ${T.TRANSPORT_CHART} LIMIT 3`
        )
      : [];
    diag.tables = { ...diag.tables as object, _TransportChartDTL: { ok: true, columns: cols.map(c => c.column_name), sampleRows: tc } };
  } catch (e) {
    diag.tables = { ...diag.tables as object, _TransportChartDTL: { ok: false, error: String(e) } };
  }

  // 6. Try the full join
  try {
    const full = await queryPrextra<CityZoneResult>(
      `SELECT shipto."City", tc."_Code"
       FROM ${T.INV_HEADER} inv
       INNER JOIN ${T.SHIPTO} shipto ON inv."shiptoid" = shipto."ShipToId"
       INNER JOIN ${T.CITY} city ON shipto."City" = city."_Name"
       INNER JOIN ${T.CITY_SETTING} cs ON city."_cityid" = cs."_CityId"
       INNER JOIN ${T.TRANSPORT_CHART} tc ON cs."_ChartDtlId" = tc."_ChartDtlid"
       WHERE inv."SoNbr"::text = $1 LIMIT 1`,
      [sonbr]
    );
    diag.fullJoin = { ok: true, rows: full.length, result: full[0] ?? null };
  } catch (e) {
    diag.fullJoin = { ok: false, error: String(e) };
  }

  return diag;
}
