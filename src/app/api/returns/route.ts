import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
