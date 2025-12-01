// src/app/api/returns/[code]/attachments/route.ts
// File attachments - GET (list), POST (upload), DELETE (remove)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseReturnCode } from "@/types/returns";
import type { AttachmentResponse } from "@/types/returns";

type RouteParams = { params: Promise<{ code: string }> };

/* =============================================================================
   GET /api/returns/[code]/attachments - List attachments
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

    const ret = await prisma.return.findUnique({
      where: { id: returnId },
      include: { attachments: { orderBy: { uploadedAt: "desc" } } },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    const attachments: AttachmentResponse[] = ret.attachments.map((a) => ({
      id: a.filePath,
      name: a.fileName,
      url: `https://drive.google.com/file/d/${a.filePath}/preview`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${a.filePath}`,
    }));

    return NextResponse.json({ ok: true, attachments });
  } catch (error) {
    console.error("GET /api/returns/[code]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des pièces jointes" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   POST /api/returns/[code]/attachments - Upload attachment
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

    const ret = await prisma.return.findUnique({
      where: { id: returnId },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Check if can upload
    if (ret.isFinal && !ret.isStandby) {
      return NextResponse.json(
        { ok: false, error: "Impossible d'ajouter des pièces jointes à un retour finalisé" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { fileId, fileName, mimeType, fileSize } = body;

    if (!fileId || !fileName) {
      return NextResponse.json(
        { ok: false, error: "fileId et fileName sont requis" },
        { status: 400 }
      );
    }

    // Save to database
    const upload = await prisma.upload.create({
      data: {
        returnId: ret.id,
        fileName: fileName,
        filePath: fileId, // Google Drive file ID
      },
    });

    return NextResponse.json({
      ok: true,
      attachment: {
        id: upload.filePath,
        name: upload.fileName,
        url: `https://drive.google.com/file/d/${upload.filePath}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${upload.filePath}`,
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
   DELETE /api/returns/[code]/attachments - Delete attachment
============================================================================= */

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    // Role check
    const userRole = (session.user as { role?: string }).role;
    if (userRole === "Expert" || userRole === "Verificateur") {
      return NextResponse.json(
        { ok: false, error: "Vous n'êtes pas autorisé à supprimer des pièces jointes" },
        { status: 403 }
      );
    }

    const { code } = await params;
    const returnId = parseReturnCode(code);
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (isNaN(returnId)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    if (!fileId) {
      return NextResponse.json({ ok: false, error: "ID de fichier requis" }, { status: 400 });
    }

    const ret = await prisma.return.findUnique({
      where: { id: returnId },
    });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Check if can delete
    if (ret.isFinal && !ret.isStandby) {
      return NextResponse.json(
        { ok: false, error: "Impossible de supprimer des pièces jointes d'un retour finalisé" },
        { status: 400 }
      );
    }

    // Delete from database
    await prisma.upload.deleteMany({
      where: { returnId: ret.id, filePath: fileId },
    });

    return NextResponse.json({ ok: true, message: "Pièce jointe supprimée" });
  } catch (error) {
    console.error("DELETE /api/returns/[code]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la suppression de la pièce jointe" },
      { status: 500 }
    );
  }
}
