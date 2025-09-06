import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchReturn = z.object({
  // allow partials
  reporter: z.enum(["expert","transporteur","autre"]).optional(),
  cause: z.enum(["production","pompe","autre_cause","exposition_sinto","transporteur","autre"]).optional(),
  expert: z.string().optional(),
  client: z.string().optional(),
  noClient: z.string().nullable().optional(),
  noCommande: z.string().nullable().optional(),
  tracking: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  dateCommande: z.string().nullable().optional(),
  transport: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["draft","awaiting_physical","received_or_no_physical"]).optional(),
  standby: z.boolean().optional(),

  products: z.array(z.object({
    id: z.number().optional(),          // existing if present
    codeProduit: z.string(),
    descriptionProduit: z.string(),
    descriptionRetour: z.string().optional().nullable(),
    quantite: z.number().int().nonnegative(),
    _delete: z.boolean().optional(),
  })).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const body = await req.json();
  const data = PatchReturn.parse(body);
  const code = decodeURIComponent(params.code);

  const ret = await prisma.return.findUnique({ where: { code }, select: { id: true } });
  if (!ret) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    // 1) patch header
    const hdr = await tx.return.update({
      where: { id: ret.id },
      data: {
        ...("reporter" in data ? { reporter: data.reporter } : {}),
        ...("cause" in data ? { cause: data.cause } : {}),
        ...("expert" in data ? { expert: data.expert } : {}),
        ...("client" in data ? { client: data.client } : {}),
        ...("noClient" in data ? { noClient: data.noClient ?? null } : {}),
        ...("noCommande" in data ? { noCommande: data.noCommande ?? null } : {}),
        ...("tracking" in data ? { tracking: data.tracking ?? null } : {}),
        ...("amount" in data ? { amount: data.amount ?? null } : {}),
        ...("dateCommande" in data ? { dateCommande: data.dateCommande ? new Date(data.dateCommande) : null } : {}),
        ...("transport" in data ? { transport: data.transport ?? null } : {}),
        ...("description" in data ? { description: data.description ?? null } : {}),
        ...("status" in data ? { status: data.status } : {}),
        ...("standby" in data ? { standby: data.standby } : {}),
      },
    });

    // 2) patch products (simple strategy: upsert or delete by id)
    if (data.products) {
      for (const p of data.products) {
        if (p._delete && p.id) {
          await tx.returnProduct.delete({ where: { id: p.id } });
          continue;
        }
        if (p.id) {
          await tx.returnProduct.update({
            where: { id: p.id },
            data: {
              codeProduit: p.codeProduit,
              descriptionProduit: p.descriptionProduit,
              descriptionRetour: p.descriptionRetour ?? null,
              quantite: p.quantite,
            },
          });
        } else {
          await tx.returnProduct.create({
            data: {
              returnId: ret.id,
              codeProduit: p.codeProduit,
              descriptionProduit: p.descriptionProduit,
              descriptionRetour: p.descriptionRetour ?? null,
              quantite: p.quantite,
            },
          });
        }
      }
    }

    return hdr;
  });

  return NextResponse.json({ ok: true, updated });
}
