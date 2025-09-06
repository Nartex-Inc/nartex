// src/app/api/returns/route.ts
// ✅ Drop-in replacement: always returns JSON, disables caching, and runs on Node.js

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z, ZodError } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  dateCommande: z.string().optional().nullable(), // ISO date string
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

// ------------------------- GET /api/returns -------------------------
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;

    const q = sp.get("q")?.trim() || "";
    const cause = sp.get("cause"); // exact enum string or "all"
    const reporter = sp.get("reporter");
    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");
    const take = Math.min(parseInt(sp.get("take") || "200", 10), 500);

    const where: any = {};
    if (cause && cause !== "all") where.cause = cause;
    if (reporter && reporter !== "all") where.reporter = reporter;

    if (dateFrom || dateTo) {
      where.reportedAt = {};
      if (dateFrom) where.reportedAt.gte = new Date(dateFrom);
      if (dateTo) where.reportedAt.lte = new Date(dateTo);
    }

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

    const rows = await prisma.return.findMany({
      where,
      include: { attachments: true, products: true },
      take,
      orderBy: { reportedAt: "desc" },
    });

    const data = rows.map((r) => ({
      id: r.code,
      reportedAt: r.reportedAt.toISOString().slice(0, 10),
      reporter: r.reporter,
      cause: r.cause,
      expert: r.expert,
      client: r.client,
      noClient: r.noClient ?? undefined,
      noCommande: r.noCommande ?? undefined,
      tracking: r.tracking ?? undefined,
      status: r.status,
      standby: r.standby,
      amount: r.amount ? Number(r.amount) : null,
      dateCommande: r.dateCommande?.toISOString().slice(0, 10) ?? null,
      transport: r.transport ?? null,
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
      })),
      description: r.description ?? undefined,
      createdBy: r.createdByName
        ? { name: r.createdByName, avatar: null, at: r.createdAt.toISOString() }
        : undefined,
    }));

    return NextResponse.json(
      { ok: true, rows: data },
      { headers: { "cache-control": "no-store, must-revalidate" } }
    );
  } catch (e: any) {
    console.error("GET /api/returns failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Internal error" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}

// ------------------------- POST /api/returns -------------------------
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const data = CreateReturn.parse(payload);

    // Unique placeholder to satisfy Prisma's required `code`
    const tmpCode =
      "R_TMP_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8);

    const created = await prisma.$transaction(async (tx) => {
      // 1) create shell with a unique temporary code
      const shell = await tx.return.create({
        data: {
          code: tmpCode, // ✅ required by schema
          reporter: data.reporter,
          cause: data.cause,
          expert: data.expert,
          client: data.client,
          noClient: data.noClient ?? null,
          noCommande: data.noCommande ?? null,
          tracking: data.tracking ?? null,
          amount: data.amount ?? null,
          dateCommande: data.dateCommande ? new Date(data.dateCommande) : null,
          transport: data.transport ?? null,
          description: data.description ?? null,
          status: "draft",
          createdByName: "current_user", // TODO: plug authenticated user
        },
        select: { id: true },
      });

      const finalCode = `R${shell.id}`;

      // 2) set final code & add products
      const withProducts = await tx.return.update({
        where: { id: shell.id },
        data: {
          code: finalCode,
          products: {
            create: data.products.map((p) => ({
              codeProduit: p.codeProduit,
              descriptionProduit: p.descriptionProduit,
              descriptionRetour: p.descriptionRetour ?? null,
              quantite: p.quantite,
            })),
          },
        },
        include: { products: true },
      });

      return withProducts;
    });

    return NextResponse.json(
      { ok: true, return: created },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", issues: e.issues },
        { status: 400, headers: { "cache-control": "no-store" } }
      );
    }
    console.error("POST /api/returns failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Internal error" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
