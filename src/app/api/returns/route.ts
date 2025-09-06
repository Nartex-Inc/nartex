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
