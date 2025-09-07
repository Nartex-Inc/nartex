// src/app/api/returns/[code]/route.ts
// ✅ Next 15–safe route handlers (PATCH + DELETE) with Zod validation & Prisma (default import)

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z, ZodError } from "zod";

/* -----------------------------------------------------------------------------
   Validation
----------------------------------------------------------------------------- */
const PatchReturn = z.object({
  reporter: z.enum(["expert", "transporteur", "autre"]).optional(),
  cause: z
    .enum([
      "production",
      "pompe",
      "autre_cause",
      "exposition_sinto",
      "transporteur",
      "autre",
    ])
    .optional(),
  expert: z.string().optional(),
  client: z.string().optional(),
  noClient: z.string().nullable().optional(),
  noCommande: z.string().nullable().optional(),
  tracking: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  dateCommande: z.string().nullable().optional(), // "YYYY-MM-DD"
  transport: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  status: z
    .enum(["draft", "awaiting_physical", "received_or_no_physical"])
    .optional(),
  standby: z.boolean().optional(),
  products: z
    .array(
      z.object({
        id: z.number().optional(), // existing if present
        codeProduit: z.string(),
        descriptionProduit: z.string(),
        descriptionRetour: z.string().optional().nullable(),
        quantite: z.number().int().nonnegative(),
        _delete: z.boolean().optional(),
      })
    )
    .optional(),
});

/* -----------------------------------------------------------------------------
   PATCH /api/returns/[code]
   - Partial update of header + upsert/delete of product lines
----------------------------------------------------------------------------- */
// Keep context untyped to satisfy Next’s validator across versions.
export async function PATCH(req: Request, context: any) {
  const codeParam = (context?.params?.code ?? "") as string;
  const code = decodeURIComponent(codeParam || "");

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Missing return code" },
      { status: 400 }
    );
  }

  let data: z.infer<typeof PatchReturn>;
  try {
    data = PatchReturn.parse(await req.json());
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Malformed JSON body" },
      { status: 400 }
    );
  }

  try {
    const ret = await prisma.return.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1) Patch header (apply only provided fields)
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
          ...("dateCommande" in data
            ? { dateCommande: data.dateCommande ? new Date(data.dateCommande) : null }
            : {}),
          ...("transport" in data ? { transport: data.transport ?? null } : {}),
          ...("description" in data ? { description: data.description ?? null } : {}),
          ...("status" in data ? { status: data.status } : {}),
          ...("standby" in data ? { standby: data.standby } : {}),
        },
      });

      // 2) Patch products (upsert / delete)
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
  } catch (e: any) {
    console.error("PATCH /api/returns/[code] failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------------------------
   DELETE /api/returns/[code]
   - Hard delete the return (and its children). Idempotent.
   - If your FKs are ON DELETE CASCADE (as in your Prisma schema), deleting the
     parent row is enough. We still delete children defensively first to work
     across environments where CASCADE might not have been applied yet.
----------------------------------------------------------------------------- */
export async function DELETE(_req: Request, context: any) {
  const codeParam = (context?.params?.code ?? "") as string;
  const code = decodeURIComponent(codeParam || "");

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Missing return code" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.return.findUnique({
      where: { code },
      select: { id: true },
    });

    // Idempotent: deleting a non-existent resource still returns ok:true
    if (!existing) {
      return NextResponse.json({ ok: true });
    }

    await prisma.$transaction(async (tx) => {
      // Defensive: remove children explicitly (safe even if CASCADE exists)
      await tx.upload.deleteMany({ where: { returnId: existing.id } }).catch(() => {});
      await tx.returnProduct
        .deleteMany({ where: { returnId: existing.id } })
        .catch(() => {});

      // Delete parent
      await tx.return.delete({ where: { id: existing.id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/returns/[code] failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Delete failed" },
      { status: 500 }
    );
  }
}
