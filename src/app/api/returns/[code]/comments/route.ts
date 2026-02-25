// src/app/api/returns/[code]/comments/route.ts
// Conversation comments on return records

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenant, getErrorMessage } from "@/lib/auth-helpers";
import { CreateReturnCommentSchema, UpdateReturnCommentSchema } from "@/lib/validations";
import { parseReturnCode, formatReturnCode } from "@/types/returns";
import { notifyReturnComment } from "@/lib/notifications";

type RouteParams = { params: Promise<{ code: string }> };

function mapComment(c: { id: string; userId: string; userName: string; userImage: string | null; content: string; createdAt: Date; updatedAt: Date | null }) {
  return {
    id: c.id,
    userId: c.userId,
    userName: c.userName,
    userImage: c.userImage,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt?.toISOString() ?? null,
  };
}

// =============================================================================
// GET - List comments for a return
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
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
      data: comments.map(mapComment),
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
  { params }: RouteParams
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
      select: { id: true, client: true },
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

    // Fire-and-forget notification
    notifyReturnComment({
      returnId,
      returnCode: formatReturnCode(returnId),
      client: ret.client || "",
      userName: user.name || user.email || "Utilisateur",
      userId: user.id,
      tenantId,
    }).catch(() => {});

    return NextResponse.json({ ok: true, data: mapComment(comment) });
  } catch (error) {
    console.error("POST /api/returns/[code]/comments error:", error);
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Edit own comment
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
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
    const parsed = UpdateReturnCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Données invalides" },
        { status: 400 }
      );
    }

    // Find the comment and check ownership
    const existing = await prisma.returnComment.findUnique({
      where: { id: parsed.data.commentId },
    });

    if (!existing || existing.returnId !== returnId) {
      return NextResponse.json({ ok: false, error: "Commentaire introuvable" }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ ok: false, error: "Vous ne pouvez modifier que vos propres commentaires" }, { status: 403 });
    }

    const updated = await prisma.returnComment.update({
      where: { id: parsed.data.commentId },
      data: {
        content: parsed.data.content.trim(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, data: mapComment(updated) });
  } catch (error) {
    console.error("PUT /api/returns/[code]/comments error:", error);
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete own comment
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
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

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");
    if (!commentId) {
      return NextResponse.json({ ok: false, error: "commentId requis" }, { status: 400 });
    }

    // Find the comment and check ownership
    const existing = await prisma.returnComment.findUnique({
      where: { id: commentId },
    });

    if (!existing || existing.returnId !== returnId) {
      return NextResponse.json({ ok: false, error: "Commentaire introuvable" }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ ok: false, error: "Vous ne pouvez supprimer que vos propres commentaires" }, { status: 403 });
    }

    await prisma.returnComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/returns/[code]/comments error:", error);
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
