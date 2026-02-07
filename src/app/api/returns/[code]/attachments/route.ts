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

    const tenantId = session.user.activeTenantId;
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "Aucun tenant actif sélectionné" }, { status: 403 });
    }

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
  console.log("[Attachments API] POST request received");
  
  try {
    const session = await getServerSession(authOptions);
    console.log("[Attachments API] Session:", session?.user?.name || "Not authenticated");
    
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const tenantId = session.user.activeTenantId;
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "Aucun tenant actif sélectionné" }, { status: 403 });
    }

    const { code } = await params;
    console.log("[Attachments API] Return code:", code);

    const codeRetour = parseCode(code);
    console.log("[Attachments API] Parsed code:", codeRetour);

    if (!codeRetour) {
      return NextResponse.json({ ok: false, error: "Code invalide" }, { status: 400 });
    }

    const ret = await prisma.return.findFirst({ where: { id: codeRetour, tenantId } });
    if (!ret) {
      console.log("[Attachments API] Return not found:", codeRetour);
      return NextResponse.json({ ok: false, error: "Retour introuvable" }, { status: 404 });
    }
    console.log("[Attachments API] Found return:", ret.id);

    const contentType = request.headers.get("content-type") || "";
    console.log("[Attachments API] Content-Type:", contentType);

    // =========================================================
    // SCENARIO 1: Multipart Form Data (Actual File Upload)
    // =========================================================
    if (contentType.includes("multipart/form-data")) {
      console.log("[Attachments API] Processing multipart form data");
      
      let formData;
      try {
        formData = await request.formData();
      } catch (formError: any) {
        console.error("[Attachments API] FormData parsing error:", formError);
        return NextResponse.json({ ok: false, error: `FormData error: ${formError.message}` }, { status: 400 });
      }
      
      const files = formData.getAll("files");
      console.log("[Attachments API] Files received:", files.length);

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
        const file = files[i] as any;
        
        // Check if it's a File-like object (has name, size, arrayBuffer method)
        // Note: We can't use `instanceof File` because File may not be defined in Node.js
        if (!file || typeof file.arrayBuffer !== 'function' || typeof file.name !== 'string') {
          console.warn(`[Attachments API] Item ${i} is not a valid file object:`, typeof file, file);
          errors.push(`Item ${i} is not a valid file`);
          continue;
        }
        
        console.log(`[Attachments API] Processing file ${i + 1}/${files.length}: ${file.name} (${file.type || 'unknown'}, ${file.size} bytes)`);

        if (file.size > 25 * 1024 * 1024) {
          console.warn(`[Attachments API] File too large: ${file.name}`);
          errors.push(`${file.name}: trop volumineux (max 25MB)`);
          continue; 
        }

        if (file.size === 0) {
          console.warn(`[Attachments API] Empty file: ${file.name}`);
          errors.push(`${file.name}: fichier vide`);
          continue;
        }

        let arrayBuffer;
        try {
          arrayBuffer = await file.arrayBuffer();
        } catch (readError: any) {
          console.error(`[Attachments API] Error reading file ${file.name}:`, readError);
          errors.push(`${file.name}: erreur de lecture`);
          continue;
        }
        
        const buffer = Buffer.from(arrayBuffer);
        console.log(`[Attachments API] Buffer size: ${buffer.length} bytes`);

        console.log(`[Attachments API] Uploading ${file.name} to Google Drive...`);

        let driveResult;
        try {
          driveResult = await uploadFileToDrive(buffer, file.name, file.type || 'application/octet-stream');
          console.log(`[Attachments API] Drive upload result:`, driveResult);
        } catch (driveErr: any) {
          console.error("[Attachments API] Google Drive Upload Failed:", driveErr);
          errors.push(`${file.name}: ${driveErr.message}`);
          continue;
        }

        if (!driveResult || !driveResult.fileId) {
          console.error("[Attachments API] No file ID returned from Drive");
          errors.push(`${file.name}: aucun ID retourné par Google Drive`);
          continue;
        }

        console.log(`[Attachments API] Drive Upload Success. ID: ${driveResult.fileId}. Saving to DB...`);

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
          console.log(`[Attachments API] Saved to DB with ID: ${attachment.id}`);
        } catch (dbErr: any) {
          console.error("[Attachments API] Database Save Failed:", dbErr);
          // Try to clean up the uploaded file
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

      console.log(`[Attachments API] Upload complete. Success: ${uploadedAttachments.length}, Errors: ${errors.length}`);

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
      console.log("[Attachments API] Processing JSON body");
      
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

    console.log("[Attachments API] Unsupported Content-Type:", contentType);
    return NextResponse.json({ ok: false, error: `Content-Type non supporté: ${contentType}` }, { status: 415 });

  } catch (error: any) {
    console.error("[Attachments API] POST Error details:", error);
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

    const tenantId = session.user.activeTenantId;
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "Aucun tenant actif sélectionné" }, { status: 403 });
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

    const ret = await prisma.return.findFirst({ where: { id: codeRetour, tenantId } });
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
