export const currency = (n: number) =>
  new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);

export const compactCurrency = (n: number) =>
  new Intl.NumberFormat("fr-CA", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "CAD",
  }).format(n);

export const percentage = (n: number) =>
  new Intl.NumberFormat("fr-CA", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("fr-CA").format(Math.round(n));
