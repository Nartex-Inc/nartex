export const RETENTION_THRESHOLD = 300;
export const NEW_CUSTOMER_MIN_SPEND = 30;

export const ALLOWED_ROLES = [
  "ventes-exec",
  "ventes_exec",
  "gestionnaire",
  "admin",
  "facturation",
];

export const BYPASS_EMAILS = ["n.labranche@sinto.ca"];

export function isUserAuthorized(
  role: string | undefined | null,
  email: string | undefined | null
): boolean {
  if (email && BYPASS_EMAILS.includes(email.toLowerCase())) {
    return true;
  }
  if (role && ALLOWED_ROLES.includes(role.toLowerCase().trim())) {
    return true;
  }
  return false;
}

export const RETURNS_DASHBOARD_ROLES = ["administrateur", "verificateur", "facturation"];

export function isReturnsDashboardUser(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalized = role.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return RETURNS_DASHBOARD_ROLES.includes(normalized);
}
