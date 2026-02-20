// src/lib/auth-helpers.ts
// Centralized auth helpers — eliminates duplicated boilerplate across 15+ API routes

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Session } from "next-auth";

// ─── Bypass Emails ───────────────────────────────────────────────────────────
// Single source of truth for admin bypass — previously hardcoded in 13+ files
export const BYPASS_EMAILS = ["n.labranche@sinto.ca"] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

/** Typed session user — matches next-auth.d.ts declarations */
export type AuthUser = Session["user"];

export type AuthResult =
  | { ok: true; session: Session; user: AuthUser }
  | { ok: false; response: NextResponse };

export type AuthWithTenantResult =
  | { ok: true; session: Session; user: AuthUser; tenantId: string }
  | { ok: false; response: NextResponse };

export type AuthWithSchemaResult =
  | { ok: true; session: Session; user: AuthUser; tenantId: string; schema: string }
  | { ok: false; response: NextResponse };

// ─── Core Helpers ────────────────────────────────────────────────────────────

/**
 * Require an authenticated session. Returns typed user or 401 response.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  return { ok: true, session, user: session.user };
}

/**
 * Require auth + active tenant. Returns tenantId or 403 response.
 */
export async function requireTenant(): Promise<AuthWithTenantResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  const tenantId = auth.user.activeTenantId;
  if (!tenantId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Aucun tenant actif sélectionné" },
        { status: 403 }
      ),
    };
  }
  return { ...auth, tenantId };
}

/**
 * Require auth + tenant + prextraSchema. Returns schema or 403 response.
 */
export async function requireSchema(): Promise<AuthWithSchemaResult> {
  const auth = await requireTenant();
  if (!auth.ok) return auth;

  const schema = auth.user.prextraSchema;
  if (!schema) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Aucune donnée ERP pour ce tenant" },
        { status: 403 }
      ),
    };
  }
  return { ...auth, schema };
}

// ─── Role Helpers ────────────────────────────────────────────────────────────

/**
 * Normalize a role string: strip accents (NFD) + lowercase + trim.
 * "Vérificateur" → "verificateur"
 */
export function normalizeRole(role: string | undefined | null): string {
  if (!role) return "";
  return role
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Check if an email is in the bypass list.
 */
export function isBypassEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return (BYPASS_EMAILS as readonly string[]).includes(email.toLowerCase());
}

/**
 * Check if a user has one of the allowed roles, or is a bypass email.
 */
export function hasRole(
  user: AuthUser,
  allowedRoles: string[]
): boolean {
  if (isBypassEmail(user.email)) return true;
  const normalized = normalizeRole(user.role);
  return allowedRoles.includes(normalized);
}

/**
 * Require specific roles. Returns 403 if the user doesn't have an allowed role.
 */
export function requireRoles(
  user: AuthUser,
  allowedRoles: string[]
): NextResponse | null {
  if (hasRole(user, allowedRoles)) return null;
  return NextResponse.json(
    { error: "Vous ne disposez pas des autorisations nécessaires." },
    { status: 403 }
  );
}

/**
 * Check if user is a Gestionnaire or bypass admin.
 */
export function isGestionnaire(user: AuthUser): boolean {
  return hasRole(user, ["gestionnaire", "administrateur"]);
}

/**
 * Check if user has the canManageTickets permission.
 * No admin bypass — must be explicitly granted.
 */
export function canManageTickets(user: AuthUser): boolean {
  return !!user.canManageTickets;
}

// ─── Error Helpers ───────────────────────────────────────────────────────────

/**
 * Extract error message from an unknown caught error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
