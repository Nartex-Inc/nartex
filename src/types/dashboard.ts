export type SalesRecord = {
  salesRepName: string;
  customerName: string;
  itemCode: string;
  invoiceDate: string;   // YYYY-MM (month-level from GROUP BY)
  firstDate: string;     // YYYY-MM-DD (earliest invoice date in group)
  salesValue: number;    // SUM of amounts in group
  txCount: number;       // COUNT of invoice rows in group
};

export type FilterState = {
  salesReps: string[];
  itemCodes: string[];
  customers: string[];
};

export type PerfRow = {
  key: string;
  prev: number;
  curr: number;
  rate: number;
  delta: number;
};

export type YoyFilter = "all" | "growth" | "loss";
