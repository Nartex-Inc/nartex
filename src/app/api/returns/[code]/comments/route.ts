// src/app/api/returns/[code]/comments/route.ts
// Conversation comments on return records

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenant, getErrorMessage } from "@/lib/auth-helpers";
import { CreateReturnCommentSchema } from "@/lib/validations";
import { parseReturnCode } from "@/types/returns";

// =============================================================================
// GET - List comments for a return
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { tenantId } = auth;

    const { code } = await params;
    const returnId = parseReturnCode(code);
    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code de retour invalide" }, { status: 400 });
    }

    // Verify return exists and belongs to tenant
    const ret = await prisma.return.findFirst({
      where: { id: returnId, tenantId },
      select: { id: true },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour introuvable" }, { status: 404 });
    }

    const comments = await prisma.returnComment.findMany({
      where: { returnId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      ok: true,
      data: comments.map((c) => ({
        id: c.id,
        userId: c.userId,
        userName: c.userName,
        userImage: c.userImage,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/returns/[code]/comments error:", error);
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Add a comment to a return
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    const { code } = await params;
    const returnId = parseReturnCode(code);
    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code de retour invalide" }, { status: 400 });
    }

    // Verify return exists and belongs to tenant
    const ret = await prisma.return.findFirst({
      where: { id: returnId, tenantId },
      select: { id: true },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour introuvable" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = CreateReturnCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Données invalides" },
        { status: 400 }
      );
    }

    const comment = await prisma.returnComment.create({
      data: {
        returnId,
        userId: user.id,
        userName: user.name || user.email || "Utilisateur",
        userImage: user.image || null,
        content: parsed.data.content.trim(),
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: comment.id,
        userId: comment.userId,
        userName: comment.userName,
        userImage: comment.userImage,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/returns/[code]/comments error:", error);
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
