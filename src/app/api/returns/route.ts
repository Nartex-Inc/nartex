import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateReturn = z.object({
  reporter: z.enum(["expert","transporteur","autre"]),
  cause: z.enum(["production","pompe","autre_cause","exposition_sinto","transporteur","autre"]),
  expert: z.string().min(1),
  client: z.string().min(1),
  noClient: z.string().optional().nullable(),
  noCommande: z.string().optional().nullable(),
  tracking: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  dateCommande: z.string().optional().nullable(), // ISO
  transport: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  products: z.array(z.object({
    codeProduit: z.string().min(1),
    descriptionProduit: z.string().default(""),
    descriptionRetour: z.string().optional(),
    quantite: z.number().int().nonnegative().default(1),
  })).optional().default([]),
});

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;

  const q = sp.get("q")?.trim() || "";
  const cause = sp.get("cause");            // exact enum string or null
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

  // map to your UI shape
  const data = rows.map(r => ({
    id: r.code,
    reportedAt: r.reportedAt.toISOString().slice(0,10),
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
    dateCommande: r.dateCommande?.toISOString().slice(0,10) ?? null,
    transport: r.transport ?? null,
    attachments: r.attachments.map(a => ({ id: String(a.id), name: a.name, url: a.url })),
    products: r.products.map(p => ({
      id: String(p.id),
      codeProduit: p.codeProduit,
      descriptionProduit: p.descriptionProduit,
      descriptionRetour: p.descriptionRetour ?? undefined,
      quantite: p.quantite,
    })),
    description: r.description ?? undefined,
    createdBy: r.createdByName ? { name: r.createdByName, avatar: null, at: r.createdAt.toISOString() } : undefined,
  }));

  return NextResponse.json({ ok: true, rows: data });
}

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const data = CreateReturn.parse(payload);

  const created = await prisma.$transaction(async (tx) => {
    // Step 1: create shell (draft)
    const shell = await tx.return.create({
      data: {
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
        createdByName: "current_user", // plug your auth user here
      },
      select: { id: true },
    });

    const code = `R${shell.id}`;

    // Step 2: patch code & add products
    const withProducts = await tx.return.update({
      where: { id: shell.id },
      data: {
        code,
        products: {
          create: data.products.map(p => ({
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

  return NextResponse.json({ ok: true, return: created });
}
