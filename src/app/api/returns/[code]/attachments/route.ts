// src/app/api/returns/[code]/attachments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// 👇 CHANGED: Removed curly braces to use default import
import prisma from "@/lib/prisma"; 
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
  // Handle "R123" or "123" format
  const cleaned = code.replace(/^R/i, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

// Define the context type for Route Handlers (params is a Promise in Next.js 15)
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
      return NextResponse.json(
        { ok: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Await params before using properties
    const { code } = await params;
    const codeRetour = parseCode(code);

    if (!codeRetour) {
      return NextResponse.json(
        { ok: false, error: "Code de retour invalide" },
        { status: 400 }
      );
    }

    // Check if return exists
    const ret = await prisma.return.findUnique({
      where: { id: codeRetour }, // ✅ Look up by ID
    });

    if (!ret) {
      return NextResponse.json(
        { ok: false, error: "Retour introuvable" },
        { status: 404 }
      );
    }

    // Get attachments
    const attachments = await prisma.returnAttachment.findMany({
      where: { returnId: ret.id },
      orderBy: { createdAt: "desc" },
    });

    // Transform to response format with preview URLs
    const data = attachments.map((a) => ({
      id: a.fileId, // Use fileId as the unique identifier
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
  } catch (error) {
    console.error("GET /api/returns/[code]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des pièces jointes" },
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
      return NextResponse.json(
        { ok: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Await params before using properties
    const { code } = await params;
    const codeRetour = parseCode(code);

    if (!codeRetour) {
      return NextResponse.json(
        { ok: false, error: "Code de retour invalide" },
        { status: 400 }
      );
    }

    // Check if return exists
    const ret = await prisma.return.findUnique({
      where: { id: codeRetour }, // ✅
    });

    if (!ret) {
      return NextResponse.json(
        { ok: false, error: "Retour introuvable" },
        { status: 404 }
      );
    }

    // Check content type
    const contentType = request.headers.get("content-type") || "";

    // Handle multipart form data (file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const files = formData.getAll("files") as File[];

      if (files.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Aucun fichier fourni" },
          { status: 400 }
        );
      }

      const uploadedAttachments = [];

      for (const file of files) {
        // Validate file type
        const allowedTypes = [
          "application/pdf",
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
          console.warn(`Skipping file with unsupported type: ${file.type}`);
          continue;
        }

        // Validate file size (max 25MB)
        const maxSize = 25 * 1024 * 1024;
        if (file.size > maxSize) {
          console.warn(`Skipping file exceeding size limit: ${file.name}`);
          continue;
        }

        // Read file buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Google Drive
        const driveResult = await uploadFileToDrive(
          buffer,
          file.name,
          file.type
        );

        // Store reference in database
        const attachment = await prisma.returnAttachment.create({
          data: {
            returnId: ret.id,
            fileId: driveResult.fileId,
            fileName: driveResult.fileName,
            mimeType: driveResult.mimeType,
            fileSize: file.size,
          },
        });

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
          { ok: false, error: "Aucun fichier valide n'a été uploadé" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: `${uploadedAttachments.length} fichier(s) uploadé(s)`,
        attachments: uploadedAttachments,
      });
    }

    // Handle JSON body (for existing Google Drive file IDs - legacy support)
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { fileId, fileName, mimeType, fileSize } = body;

      if (!fileId) {
        return NextResponse.json(
          { ok: false, error: "fileId requis" },
          { status: 400 }
        );
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

    return NextResponse.json(
      { ok: false, error: "Content-Type non supporté" },
      { status: 415 }
    );
  } catch (error) {
    console.error("POST /api/returns/[code]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de l'upload" },
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
      return NextResponse.json(
        { ok: false, error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Await params before using properties
    const { code } = await params;
    const codeRetour = parseCode(code);

    if (!codeRetour) {
      return NextResponse.json(
        { ok: false, error: "Code de retour invalide" },
        { status: 400 }
      );
    }

    // Get fileId from query params
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { ok: false, error: "fileId requis" },
        { status: 400 }
      );
    }

    // Check if return exists
    const ret = await prisma.return.findUnique({
      where: { id: codeRetour }, // ✅
    });

    if (!ret) {
      return NextResponse.json(
        { ok: false, error: "Retour introuvable" },
        { status: 404 }
      );
    }

    // Find the attachment
    const attachment = await prisma.returnAttachment.findFirst({
      where: {
        returnId: ret.id,
        fileId: fileId,
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { ok: false, error: "Pièce jointe introuvable" },
        { status: 404 }
      );
    }

    // Delete from Google Drive (optional - controlled by query param)
    const deleteFromDrive = searchParams.get("deleteFromDrive") !== "false";
    
    if (deleteFromDrive) {
      try {
        await deleteFileFromDrive(fileId);
      } catch (driveError) {
        console.error("Error deleting from Google Drive:", driveError);
        // Continue to delete DB record even if Drive deletion fails
      }
    }

    // Delete from database
    await prisma.returnAttachment.delete({
      where: { id: attachment.id },
    });

    return NextResponse.json({
      ok: true,
      message: "Pièce jointe supprimée",
      deletedFileId: fileId,
    });
  } catch (error) {
    console.error("DELETE /api/returns/[code]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
