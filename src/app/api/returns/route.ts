// src/app/api/returns/route.ts
// ✅ GET list + POST create with “R#” that reuses the LOWEST free number,
// and records the creator's name from NextAuth (createdByName).

import { NextRequest, NextResponse } from "next/server";
import {
  Prisma,
  PrismaClient,
  Reporter,
  Cause,
  ReturnStatus,
} from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}
const prisma =
  global._prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
if (process.env.NODE_ENV !== "production") global._prisma = prisma;

/* -----------------------------------------------------------------------------
   Types expected by the frontend page
----------------------------------------------------------------------------- */
type Attachment = { id: string; name: string; url: string };
type ProductLine = {
  id: string;
  codeProduit: string;
  descriptionProduit: string;
  descriptionRetour?: string;
  quantite: number;
  // optional (not persisted)
  poidsUnitaire?: number | null;
  poidsTotal?: number | null;
};
type ReturnRow = {
  id: string; // human code "R#"
  reportedAt: string;
  reporter: Reporter;
  cause: Cause;
  expert: string;
  client: string;
  noClient?: string;
  noCommande?: string;
  tracking?: string;
  status: ReturnStatus;
  standby?: boolean;
  amount?: number | null;
  dateCommande?: string | null;
  transport?: string | null;
  attachments?: Attachment[];
  products?: ProductLine[];
  description?: string;
  createdBy?: { name: string; avatar?: string | null; at: string };
};

/* -----------------------------------------------------------------------------
   Helpers
----------------------------------------------------------------------------- */
const num = (v: unknown) => (v == null ? null : Number(v));
const parseDate = (v?: string | null) => (v ? new Date(v) : null);

async function fetchOneReturnDB(id: number) {
  return prisma.return.findUniqueOrThrow({
    where: { id },
    include: { products: true, attachments: true },
  });
}

// Map DB → API row the table expects
function toReturnRow(
  r: Awaited<ReturnType<typeof fetchOneReturnDB>>
): ReturnRow {
  return {
    id: r.code ?? `R${r.id}`,
    reportedAt: r.reportedAt.toISOString(),
    reporter: r.reporter,
    cause: r.cause,
    expert: r.expert,
    client: r.client,
    noClient: r.noClient ?? undefined,
    noCommande: r.noCommande ?? undefined,
    tracking: r.tracking ?? undefined,
    status: r.status,
    standby: r.standby ?? undefined,
    amount: r.amount == null ? null : Number(r.amount),
    dateCommande: r.dateCommande
      ? r.dateCommande.toISOString().slice(0, 10)
      : null,
    transport: r.transport ?? null,
    description: r.description ?? undefined,
    createdBy: r.createdByName
      ? { name: r.createdByName, avatar: null, at: r.createdAt.toISOString() }
      : undefined,
    attachments: r.attachments.map((a) => ({
      id: String(a.id),
      name: a.name,
      url: a.url,
    })),
    products: r.products.map((p) => ({
      id: String(p.id),
      codeProduit: p.codeProduit,
      descriptionProduit: p.descriptionProduit,
      descriptionRetour: p.descriptionRetour ?? undefined,
      quantite: p.quantite,
      // optional weights (not persisted)
      poidsUnitaire: null,
      poidsTotal: null,
    })),
  };
}

/**
 * Compute the smallest available positive integer N such that no row uses code "RN".
 * This lets codes restart at R1 when all rows are deleted, and also fills gaps (R1, R3 → next is R2).
 * Run inside a transaction to reduce the chance of races; on rare conflict, the caller retries.
 */
async function nextReturnCode(
  tx: Prisma.TransactionClient
): Promise<string> {
  const rows = await tx.return.findMany({ select: { code: true } });
  const used = new Set<number>();
  for (const r of rows) {
    const m = /^R(\d+)$/.exec(r.code ?? "");
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) used.add(n);
    }
  }
  let n = 1;
  while (used.has(n)) n++;
  return `R${n}`;
}

/** Safely read NextAuth session user and return a displayable name/image. */
async function getCreatorFromSession(): Promise<{
  name: string | null;
  image: string | null;
}> {
  // NextAuth v5 (preferred): "@/auth"
  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const m: any = await import("@/auth");
    if (typeof m?.auth === "function") {
      const session = await m.auth();
      const u = session?.user || null;
      const name =
        u?.name ??
        (u?.email ? String(u.email).split("@")[0] : null) ??
        null;
      const image = u?.image ?? null;
      return { name, image };
    }
  } catch {
    /* ignore and try v4 fallback below */
  }

  // NextAuth v4/v5 fallback: getServerSession()
  try {
    const { getServerSession } = await import("next-auth");
    // Try without options (v5), then with options from the legacy path (v4)
    let session: any = null;
    try {
      session = await getServerSession();
    } catch {
      try {
        const mod: any = await import(
          "@/pages/api/auth/[...nextauth]"
        );
        const authOptions = mod?.authOptions ?? mod?.default;
        if (authOptions) session = await getServerSession(authOptions);
      } catch {
        /* no options available */
      }
    }
    const u = session?.user || null;
    const name =
      u?.name ??
      (u?.email ? String(u.email).split("@")[0] : null) ??
      null;
    const image = u?.image ?? null;
    return { name, image };
  } catch {
    /* ignore */
  }

  return { name: null, image: null };
}

/* -----------------------------------------------------------------------------
   GET /api/returns  (list)
----------------------------------------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const cause = (url.searchParams.get("cause") ??
      undefined) as Cause | "all" | undefined;
    const reporter = (url.searchParams.get("reporter") ??
      undefined) as Reporter | "all" | undefined;
    const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
    const dateTo = url.searchParams.get("dateTo") ?? undefined;
    const take = Math.min(
      Number(url.searchParams.get("take") ?? 200) || 200,
      500
    );

    const where: Prisma.ReturnWhereInput = {};

    if (q) {
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { client: { contains: q, mode: "insensitive" } },
        { expert: { contains: q, mode: "insensitive" } },
        { noClient: { contains: q, mode: "insensitive" } },
        { noCommande: { contains: q, mode: "insensitive" } },
        { tracking: { contains: q, mode: "insensitive" } },
      ];
    }

    if (cause && cause !== "all") where.cause = cause as Cause;
    if (reporter && reporter !== "all") where.reporter = reporter as Reporter;

    if (dateFrom || dateTo) {
      const gte = dateFrom ? new Date(dateFrom) : undefined;
      // include the entire end day
      const lte = dateTo
        ? new Date(new Date(dateTo).setHours(23, 59, 59, 999))
        : undefined;
      where.reportedAt = { gte, lte };
    }

    const data = await prisma.return.findMany({
      where,
      orderBy: { reportedAt: "desc" },
      include: { products: true, attachments: true },
      take,
    });

    const rows: ReturnRow[] = data.map((r) =>
      toReturnRow(r as Awaited<ReturnType<typeof fetchOneReturnDB>>)
    );
    return NextResponse.json(
      { ok: true, rows },
      { headers: { "cache-control": "no-store, must-revalidate" } }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Erreur" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------------------------
   POST /api/returns  (create)
   - Generates a human code "R#" that reuses the LOWEST FREE number
   - Records the creator's name from NextAuth in createdByName
----------------------------------------------------------------------------- */
type CreatePayload = {
  reporter: Reporter;
  cause: Cause;
  expert: string;
  client: string;
  noClient?: string | null;
  noCommande?: string | null;
  tracking?: string | null;
  amount?: number | null;
  dateCommande?: string | null; // "YYYY-MM-DD"
  transport?: string | null;
  description?: string | null;
  products?: {
    codeProduit: string;
    descriptionProduit: string;
    descriptionRetour?: string | null;
    quantite: number;
  }[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreatePayload;

    if (!body.expert?.trim() || !body.client?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Expert et client sont requis." },
        { status: 400 }
      );
    }

    // Who is creating? (best-effort)
    const { name: sessionName } = await getCreatorFromSession();
    const creatorName = sessionName ?? "Utilisateur";

    // Try a couple of times in case two users race for the same "R#"
    let attempts = 0;
    while (true) {
      attempts++;
      try {
        const created = await prisma.$transaction(async (tx) => {
          const code = await nextReturnCode(tx);

          const base = await tx.return.create({
            data: {
              code, // ✅ independent from autoincrement id
              reporter: body.reporter,
              cause: body.cause,
              expert: body.expert.trim(),
              client: body.client.trim(),
              noClient: body.noClient?.trim() || null,
              noCommande: body.noCommande?.trim() || null,
              tracking: body.tracking?.trim() || null,
              amount:
                body.amount == null
                  ? null
                  : new Prisma.Decimal(num(body.amount) ?? 0),
              dateCommande: parseDate(body.dateCommande),
              transport: body.transport?.trim() || null,
              description: body.description?.trim() || null,
              createdByName: creatorName,
              products: {
                create:
                  (body.products ?? []).map((p) => ({
                    codeProduit: p.codeProduit.trim(),
                    descriptionProduit: p.descriptionProduit.trim(),
                    descriptionRetour: p.descriptionRetour?.trim() || null,
                    quantite: p.quantite || 0,
                  })) ?? [],
              },
            },
            include: { products: true, attachments: true },
          });

          return base;
        });

        const row = toReturnRow(
          created as Awaited<ReturnType<typeof fetchOneReturnDB>>
        );
        return NextResponse.json(
          { ok: true, return: row },
          { headers: { "cache-control": "no-store" } }
        );
      } catch (e: any) {
        // Unique constraint on `code` might trip in a rare race; retry quickly.
        if (e?.code === "P2002" && attempts < 3) continue;
        throw e;
      }
    }
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Création échouée" },
      { status: 500 }
    );
  }
}
