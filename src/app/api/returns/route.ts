// src/app/api/returns/route.ts
// Fully updated drop-in route: robust validation, proper caching headers,
// safe Prisma usage, and creation of returns + product rows with code "R{id}"

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma, Reporter, Cause, ReturnStatus } from "@prisma/client";
import { z, ZodError } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ========================================================================== */
/* Zod validation                                                             */
/* ========================================================================== */
const CreateReturn = z.object({
  reporter: z.enum(["expert", "transporteur", "autre"]),
  cause: z.enum([
    "production",
    "pompe",
    "autre_cause",
    "exposition_sinto",
    "transporteur",
    "autre",
  ]),
  expert: z.string().min(1),
  client: z.string().min(1),
  noClient: z.string().optional().nullable(),
  noCommande: z.string().optional().nullable(),
  tracking: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  dateCommande: z.string().optional().nullable(), // "YYYY-MM-DD"
  transport: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  products: z
    .array(
      z.object({
        codeProduit: z.string().min(1),
        descriptionProduit: z.string().default(""),
        descriptionRetour: z.string().optional().nullable(),
        quantite: z.number().int().nonnegative().default(1),
      })
    )
    .optional()
    .default([]),
});

/* ========================================================================== */
/* Types for the frontend mapping                                             */
/* ========================================================================== */
type Attachment = { id: string; name: string; url: string };
type ProductLine = {
  id: string;
  codeProduit: string;
  descriptionProduit: string;
  descriptionRetour?: string;
  quantite: number;
  poidsUnitaire?: number | null;
  poidsTotal?: number | null;
};
type ReturnRow = {
  id: string; // human code "R{id}"
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

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */
const num = (v: unknown) => (v == null ? null : Number(v));
const parseDate = (v?: string | null) => (v ? new Date(v) : null);

// Narrow include we always use, double-duty for typing in toReturnRow
async function fetchOneReturnDB(id: number) {
  return prisma.return.findUniqueOrThrow({
    where: { id },
    include: { products: true, attachments: true },
  });
}

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
    dateCommande: r.dateCommande ? r.dateCommande.toISOString().slice(0, 10) : null,
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
      // optional UI fields not persisted yet
      poidsUnitaire: null,
      poidsTotal: null,
    })),
  };
}

/* ========================================================================== */
/* GET /api/returns                                                            */
/* ========================================================================== */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const cause = (url.searchParams.get("cause") ?? undefined) as Cause | "all" | undefined;
    const reporter = (url.searchParams.get("reporter") ?? undefined) as Reporter | "all" | undefined;
    const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
    const dateTo = url.searchParams.get("dateTo") ?? undefined;
    const take = Math.min(Number(url.searchParams.get("take") ?? 200) || 200, 500);

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
      // include entire end day
      const lte = dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : undefined;
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
    console.error("GET /api/returns failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Erreur" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}

/* ========================================================================== */
/* POST /api/returns                                                           */
/* ========================================================================== */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const data = CreateReturn.parse(payload);

    // Because `Return.code` is required + unique, we create with a unique temp code
    const tmpCode =
      "R_TMP_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8);

    const created = await prisma.$transaction(async (tx) => {
      // 1) create the return (shell)
      const shell = await tx.return.create({
        data: {
          code: tmpCode, // required placeholder
          reporter: data.reporter,
          cause: data.cause,
          expert: data.expert.trim(),
          client: data.client.trim(),
          noClient: data.noClient?.trim() || null,
          noCommande: data.noCommande?.trim() || null,
          tracking: data.tracking?.trim() || null,
          amount:
            data.amount == null ? null : new Prisma.Decimal(num(data.amount) ?? 0),
          dateCommande: data.dateCommande ? new Date(data.dateCommande) : null,
          transport: data.transport?.trim() || null,
          description: data.description?.trim() || null,
          status: "draft",
          createdByName: "current_user", // TODO: replace with real user when auth is wired
        },
        select: { id: true },
      });

      const finalCode = `R${shell.id}`;

      // 2) set final code & create product rows
      const withProducts = await tx.return.update({
        where: { id: shell.id },
        data: {
          code: finalCode,
          products: {
            create: (data.products ?? []).map((p) => ({
              codeProduit: p.codeProduit.trim(),
              descriptionProduit: p.descriptionProduit?.trim() ?? "",
              descriptionRetour: p.descriptionRetour?.trim() || null,
              quantite: p.quantite ?? 0,
            })),
          },
        },
        include: { products: true, attachments: true },
      });

      return withProducts;
    });

    const row = toReturnRow(created as Awaited<ReturnType<typeof fetchOneReturnDB>>);

    return NextResponse.json(
      { ok: true, return: row },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err: any) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", issues: err.issues },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }
    console.error("POST /api/returns failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Création échouée" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
