// src/app/api/returns/[code]/standby/route.ts
// Toggle standby status - POST

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseReturnCode, formatReturnCode } from "@/types/returns";
import { notifyReturnStandby } from "@/lib/notifications";
import { requireTenant, requireRoles } from "@/lib/auth-helpers";
import { StandbyReturnSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ code: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    // Role check: Gestionnaire/Administrateur or Facturation
    const roleError = requireRoles(user, ["gestionnaire", "administrateur", "facturation"]);
    if (roleError) return roleError;

    const { code } = await params;
    const returnId = parseReturnCode(code);

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findFirst({
      where: { id: returnId, tenantId },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Zod validation
    const raw = await request.json();
    const parsed = StandbyReturnSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Données invalides. Utilisez 'standby' ou 'reactivate'", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { action } = parsed.data;

    if (action === "standby") {
      // Preconditions: must not be draft, must not already be standby
      if (ret.isDraft && !ret.isStandby) {
        return NextResponse.json(
          { ok: false, error: "Impossible de mettre un brouillon en standby" },
          { status: 400 }
        );
      }
      if (ret.isStandby) {
        return NextResponse.json(
          { ok: false, error: "Ce retour est déjà en standby" },
          { status: 400 }
        );
      }

      // Put in standby - special state: isFinal=true, isDraft=true, isStandby=true
      await prisma.return.update({
        where: { id: returnId },
        data: {
          isFinal: true,
          isDraft: true,
          isStandby: true,
        },
      });

      // Fire-and-forget notification
      notifyReturnStandby({
        returnId,
        returnCode: formatReturnCode(returnId),
        userName: user.name || user.email || "Système",
        tenantId,
      }).catch(console.error);

      return NextResponse.json({
        ok: true,
        message: "Retour mis en standby",
        data: { id: formatReturnCode(returnId), status: "standby" },
      });
    } else {
      // reactivate
      // Precondition: must be in standby
      if (!ret.isStandby) {
        return NextResponse.json(
          { ok: false, error: "Ce retour n'est pas en standby" },
          { status: 400 }
        );
      }

      // Reactivate - reset to active state
      await prisma.return.update({
        where: { id: returnId },
        data: {
          isFinal: false,
          isDraft: false,
          isStandby: false,
          finalizedBy: null,
          finalizedAt: null,
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Retour réactivé",
        data: { id: formatReturnCode(returnId), status: "active" },
      });
    }
  } catch (error) {
    console.error("POST /api/returns/[code]/standby error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la modification du statut" },
      { status: 500 }
    );
  }
}
