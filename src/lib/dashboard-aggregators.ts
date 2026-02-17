import type { SalesRecord } from "@/types/dashboard";

export function aggregateData(data: SalesRecord[], key: keyof SalesRecord, topN?: number) {
  const aggregated = data.reduce((acc, d) => {
    const groupKey = d[key] as string;
    acc[groupKey] = (acc[groupKey] || 0) + d.salesValue;
    return acc;
  }, {} as Record<string, number>);

  const sorted = Object.entries(aggregated)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return topN ? sorted.slice(0, topN) : sorted;
}

export function totalsByRep(records: SalesRecord[]) {
  return records.reduce((acc, r) => {
    acc[r.salesRepName] = (acc[r.salesRepName] || 0) + r.salesValue;
    return acc;
  }, {} as Record<string, number>);
}

export function totalsByRepCustomer(records: SalesRecord[]) {
  const out: Record<string, Record<string, number>> = {};
  for (const r of records) {
    out[r.salesRepName] ??= {};
    out[r.salesRepName][r.customerName] = (out[r.salesRepName][r.customerName] || 0) + r.salesValue;
  }
  return out;
}

export function totalsByKey<T extends keyof SalesRecord>(records: SalesRecord[], key: T) {
  return records.reduce((acc, r) => {
    const k = r[key] as unknown as string;
    acc[k] = (acc[k] || 0) + r.salesValue;
    return acc;
  }, {} as Record<string, number>);
}
