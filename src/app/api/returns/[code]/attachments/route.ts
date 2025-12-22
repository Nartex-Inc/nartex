// src/app/api/returns/[code]/attachments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma"; 
import { Buffer } from "buffer"; // Explicit import for safety
import {
  uploadFileToDrive,
  deleteFileFromDrive,
  getPreviewUrl,
  getDownloadUrl,
  getViewUrl,
} from "@/lib/google-drive";

/* =============================================================================
   Helpers
============================================================================= */

function parseCode(code: string): number | null {
  const cleaned = code.replace(/^R/i, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

type RouteContext = {
  params: Promise<{ code: string }>;
};

/* =============================================================================
   GET - List attachments for a return
============================================================================= */

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { code } = await params;
    const codeRetour = parseCode(code);

    if (!codeRetour) {
      return NextResponse.json({ ok: false, error: "Code de retour invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findUnique({ where: { id: codeRetour } });

    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour introuvable" }, { status: 404 });
    }

    const attachments = await prisma.returnAttachment.findMany({
      where: { returnId: ret.id },
      orderBy: { createdAt: "desc" },
    });

    const data = attachments.map((a) => ({
      id: a.fileId,
      dbId: a.id,
      name: a.fileName,
      mimeType: a.mimeType,
      fileSize: a.fileSize,
      url: getViewUrl(a.fileId),
      previewUrl: getPreviewUrl(a.fileId),
      downloadUrl: getDownloadUrl(a.fileId),
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, attachments: data });
  } catch (error: any) {
    console.error("GET Attachment Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Erreur de chargement" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   POST - Upload file(s) to Google Drive and link to return
============================================================================= */

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { code } = await params;
    const codeRetour = parseCode(code);

    if (!codeRetour) {
      return NextResponse.json({ ok: false, error: "Code invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findUnique({ where: { id: codeRetour } });
    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour introuvable" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";

    // =========================================================
    // SCENARIO 1: Multipart Form Data (Actual File Upload)
    // =========================================================
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const files = formData.getAll("files") as File[];

      if (files.length === 0) {
        return NextResponse.json({ ok: false, error: "Aucun fichier fourni" }, { status: 400 });
      }

      const uploadedAttachments = [];

      for (const file of files) {
        if (file.size > 25 * 1024 * 1024) {
          console.warn(`File too large: ${file.name}`);
          continue; 
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`Uploading ${file.name} to Google Drive...`);

        let driveResult;
        try {
          driveResult = await uploadFileToDrive(buffer, file.name, file.type);
        } catch (driveErr: any) {
          console.error("Google Drive Upload Failed:", driveErr);
          throw new Error(`Google Drive Error: ${driveErr.message}`);
        }

        if (!driveResult || !driveResult.fileId) {
          throw new Error("Upload Google Drive réussi mais aucun ID retourné.");
        }

        console.log(`Drive Upload Success. ID: ${driveResult.fileId}. Saving to DB...`);

        let attachment;
        try {
          attachment = await prisma.returnAttachment.create({
            data: {
              returnId: ret.id,
              fileId: driveResult.fileId, // Maps to 'filePath' column
              fileName: driveResult.fileName,
              mimeType: driveResult.mimeType,
              fileSize: file.size,
            },
          });
        } catch (dbErr: any) {
          console.error("Database Save Failed:", dbErr);
          await deleteFileFromDrive(driveResult.fileId).catch(console.error);
          throw new Error(`Database Error: ${dbErr.message}`);
        }

        uploadedAttachments.push({
          id: attachment.fileId,
          dbId: attachment.id,
          name: attachment.fileName,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          url: driveResult.webViewLink,
          previewUrl: driveResult.previewLink,
          downloadUrl: driveResult.downloadLink,
          createdAt: attachment.createdAt.toISOString(),
        });
      }

      if (uploadedAttachments.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Aucun fichier n'a pu être sauvegardé." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: `${uploadedAttachments.length} fichier(s) uploadé(s)`,
        attachments: uploadedAttachments,
      });
    }

    // =========================================================
    // SCENARIO 2: JSON Body (Legacy / Direct Link by ID)
    // =========================================================
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { fileId, fileName, mimeType, fileSize } = body;

      if (!fileId) {
        return NextResponse.json({ ok: false, error: "fileId requis" }, { status: 400 });
      }

      // Check if attachment already exists
      const existing = await prisma.returnAttachment.findFirst({
        where: {
          returnId: ret.id,
          fileId: fileId, // Maps to 'filePath'
        },
      });

      if (existing) {
        return NextResponse.json(
          { ok: false, error: "Ce fichier est déjà attaché à ce retour" },
          { status: 409 }
        );
      }

      // Create attachment record
      const attachment = await prisma.returnAttachment.create({
        data: {
          returnId: ret.id,
          fileId: fileId,
          fileName: fileName || "Unknown",
          mimeType: mimeType || "application/octet-stream",
          fileSize: fileSize || null,
        },
      });

      return NextResponse.json({
        ok: true,
        attachment: {
          id: attachment.fileId,
          dbId: attachment.id,
          name: attachment.fileName,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          url: getViewUrl(attachment.fileId),
          previewUrl: getPreviewUrl(attachment.fileId),
          downloadUrl: getDownloadUrl(attachment.fileId),
          createdAt: attachment.createdAt.toISOString(),
        },
      });
    }

    return NextResponse.json({ ok: false, error: "Content-Type non supporté" }, { status: 415 });

  } catch (error: any) {
    console.error("POST Error details:", error);
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : "Erreur inconnue serveur" 
      },
      { status: 500 }
    );
  }
}

/* =============================================================================
   DELETE - Remove attachment
============================================================================= */

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { code } = await params;
    const codeRetour = parseCode(code);

    if (!codeRetour) {
      return NextResponse.json({ ok: false, error: "Code invalide" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ ok: false, error: "fileId requis" }, { status: 400 });
    }

    const ret = await prisma.return.findUnique({ where: { id: codeRetour } });
    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour introuvable" }, { status: 404 });
    }

    // Find attachment using the mapped field (Prisma: fileId -> DB: filePath)
    const attachment = await prisma.returnAttachment.findFirst({
      where: {
        returnId: ret.id,
        fileId: fileId, 
      },
    });

    if (!attachment) {
      return NextResponse.json({ ok: false, error: "Pièce jointe introuvable" }, { status: 404 });
    }

    const deleteFromDrive = searchParams.get("deleteFromDrive") !== "false";
     
    if (deleteFromDrive) {
      try {
        await deleteFileFromDrive(fileId);
      } catch (driveError) {
        console.error("Drive Delete Error (ignoring):", driveError);
      }
    }

    await prisma.returnAttachment.delete({ where: { id: attachment.id } });

    return NextResponse.json({
      ok: true,
      message: "Pièce jointe supprimée",
      deletedFileId: fileId,
    });
  } catch (error: any) {
    console.error("DELETE Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Erreur de suppression" },
      { status: 500 }
    );
  }
}
