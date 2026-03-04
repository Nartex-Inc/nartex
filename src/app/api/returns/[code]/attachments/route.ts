// src/app/api/returns/[code]/attachments/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Buffer } from "buffer";
import {
  uploadFileToDrive,
  deleteFileFromDrive,
  getPreviewUrl,
  getDownloadUrl,
  getViewUrl,
} from "@/lib/google-drive";
import { requireTenant, requireRoles } from "@/lib/auth-helpers";

/* =============================================================================
   Constants
============================================================================= */

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp", "image/tiff",
  // PDF
  "application/pdf",
  // Office documents
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text / CSV
  "text/plain", "text/csv",
]);

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
   Open to all authenticated users with valid tenant.
============================================================================= */

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { tenantId } = auth;

    const { code } = await params;
    const codeRetour = parseCode(code);

    if (!codeRetour) {
      return NextResponse.json({ ok: false, error: "Code de retour invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findFirst({ where: { id: codeRetour, tenantId } });

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
  } catch (error: unknown) {
    console.error("GET Attachment Error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des pièces jointes" },
      { status: 500 }
    );
  }
}

/* =============================================================================
   POST - Upload file(s) to Google Drive and link to return
   Only Gestionnaire/Analyste can upload.
============================================================================= */

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    // Role guard: only Gestionnaire/Administrateur/Analyste/Facturation can upload
    const roleError = requireRoles(user, ["gestionnaire", "administrateur", "analyste", "facturation"]);
    if (roleError) return roleError;

    const { code } = await params;
    const codeRetour = parseCode(code);

    if (!codeRetour) {
      return NextResponse.json({ ok: false, error: "Code invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findFirst({ where: { id: codeRetour, tenantId } });
    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour introuvable" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";

    // =========================================================
    // SCENARIO 1: Multipart Form Data (Actual File Upload)
    // =========================================================
    if (contentType.includes("multipart/form-data")) {
      let formData;
      try {
        formData = await request.formData();
      } catch (formError: unknown) {
        const msg = formError instanceof Error ? formError.message : "Unknown error";
        console.error("[Attachments API] FormData parsing error:", formError);
        return NextResponse.json({ ok: false, error: `FormData error: ${msg}` }, { status: 400 });
      }

      const files = formData.getAll("files");

      if (files.length === 0) {
        return NextResponse.json({ ok: false, error: "Aucun fichier fourni" }, { status: 400 });
      }

      const uploadedAttachments: Array<{
        id: string;
        dbId: number;
        name: string;
        mimeType: string;
        fileSize: number;
        url: string;
        previewUrl: string;
        downloadUrl: string;
        createdAt: string;
      }> = [];
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i] as { arrayBuffer: () => Promise<ArrayBuffer>; name: string; type: string; size: number };

        if (!file || typeof file.arrayBuffer !== 'function' || typeof file.name !== 'string') {
          errors.push(`Item ${i} is not a valid file`);
          continue;
        }

        if (file.size > 25 * 1024 * 1024) {
          errors.push(`${file.name}: trop volumineux (max 25MB)`);
          continue;
        }

        if (file.size === 0) {
          errors.push(`${file.name}: fichier vide`);
          continue;
        }

        if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
          errors.push(`${file.name}: type de fichier non autorisé (${file.type})`);
          continue;
        }

        let arrayBuffer;
        try {
          arrayBuffer = await file.arrayBuffer();
        } catch (readError: unknown) {
          console.error(`[Attachments API] Error reading file ${file.name}:`, readError);
          errors.push(`${file.name}: erreur de lecture`);
          continue;
        }

        const buffer = Buffer.from(arrayBuffer);

        let driveResult;
        try {
          driveResult = await uploadFileToDrive(buffer, file.name, file.type || 'application/octet-stream');
        } catch (driveErr: unknown) {
          const msg = driveErr instanceof Error ? driveErr.message : "Unknown error";
          console.error("[Attachments API] Google Drive Upload Failed:", driveErr);
          errors.push(`${file.name}: ${msg}`);
          continue;
        }

        if (!driveResult || !driveResult.fileId) {
          console.error("[Attachments API] No file ID returned from Drive");
          errors.push(`${file.name}: aucun ID retourné par Google Drive`);
          continue;
        }

        let attachment;
        try {
          attachment = await prisma.returnAttachment.create({
            data: {
              returnId: ret.id,
              fileId: driveResult.fileId,
              fileName: driveResult.fileName,
              mimeType: driveResult.mimeType,
              fileSize: file.size,
            },
          });
        } catch (dbErr: unknown) {
          console.error("[Attachments API] Database Save Failed:", dbErr);
          await deleteFileFromDrive(driveResult.fileId).catch(console.error);
          errors.push(`${file.name}: erreur base de données`);
          continue;
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
        const errorMsg = errors.length > 0
          ? `Aucun fichier uploadé. Erreurs: ${errors.join('; ')}`
          : "Aucun fichier n'a pu être sauvegardé.";
        return NextResponse.json(
          { ok: false, error: errorMsg },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: `${uploadedAttachments.length} fichier(s) uploadé(s)`,
        attachments: uploadedAttachments,
        errors: errors.length > 0 ? errors : undefined,
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
          fileId: fileId,
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

    return NextResponse.json({ ok: false, error: `Content-Type non supporté: ${contentType}` }, { status: 415 });

  } catch (error: unknown) {
    console.error("[Attachments API] POST Error details:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Erreur lors de l'upload des fichiers"
      },
      { status: 500 }
    );
  }
}

/* =============================================================================
   DELETE - Remove attachment
   Only Gestionnaire/Analyste can delete attachments.
============================================================================= */

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const auth = await requireTenant();
    if (!auth.ok) return auth.response;
    const { user, tenantId } = auth;

    // Role guard: only Gestionnaire/Administrateur/Analyste can delete attachments
    const roleError = requireRoles(user, ["gestionnaire", "administrateur", "analyste"]);
    if (roleError) return roleError;

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

    const ret = await prisma.return.findFirst({ where: { id: codeRetour, tenantId } });
    if (!ret) {
      return NextResponse.json({ ok: false, error: "Retour introuvable" }, { status: 404 });
    }

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
  } catch (error: unknown) {
    console.error("DELETE Error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la suppression de la pièce jointe" },
      { status: 500 }
    );
  }
}
