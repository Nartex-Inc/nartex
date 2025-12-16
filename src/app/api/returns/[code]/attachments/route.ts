// src/app/api/returns/[code]/attachments/route.ts
// Attachment operations - GET (list), POST (add), DELETE (remove)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseReturnCode } from "@/types/returns";

type RouteParams = { params: Promise<{ code: string }> };

/* =============================================================================
   GET /api/returns/[code]/attachments - List attachments for a return
============================================================================= */

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { code } = await params;
    const returnId = parseReturnCode(code);

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const attachments = await prisma.returnAttachment.findMany({
      where: { returnId },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      attachments: attachments.map((a) => ({
        id: a.filePath,
        name: a.fileName,
        url: `https://drive.google.com/file/d/${a.filePath}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${a.filePath}`,
        uploadedAt: a.uploadedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/returns/[code]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des pièces jointes" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   POST /api/returns/[code]/attachments - Add attachment to return
============================================================================= */

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { code } = await params;
    const returnId = parseReturnCode(code);

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    // Verify return exists
    const ret = await prisma.return.findUnique({
      where: { id: returnId },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const { fileId, fileName } = body;

    if (!fileId || !fileName) {
      return NextResponse.json(
        { ok: false, error: "fileId et fileName sont requis" },
        { status: 400 }
      );
    }

    // Create attachment record
    const attachment = await prisma.returnAttachment.create({
      data: {
        returnId,
        filePath: fileId,
        fileName,
      },
    });

    return NextResponse.json({
      ok: true,
      attachment: {
        id: attachment.filePath,
        name: attachment.fileName,
        url: `https://drive.google.com/file/d/${attachment.filePath}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${attachment.filePath}`,
        uploadedAt: attachment.uploadedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/returns/[code]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de l'ajout de la pièce jointe" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   DELETE /api/returns/[code]/attachments?fileId=xxx - Remove attachment
============================================================================= */

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { code } = await params;
    const returnId = parseReturnCode(code);

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { ok: false, error: "fileId est requis" },
        { status: 400 }
      );
    }

    // Delete attachment by filePath (Google Drive ID)
    const deleted = await prisma.returnAttachment.deleteMany({
      where: {
        returnId,
        filePath: fileId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { ok: false, error: "Pièce jointe non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, message: "Pièce jointe supprimée" });
  } catch (error) {
    console.error("DELETE /api/returns/[code]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la suppression de la pièce jointe" },
      { status: 500 }
    );
  }
}
