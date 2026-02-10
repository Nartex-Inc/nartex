// src/app/api/support/tickets/[id]/attachments/route.ts
// Upload and delete attachments for support tickets

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Buffer } from "buffer";
import {
  uploadFileToDrive,
  deleteFileFromDrive,
} from "@/lib/google-drive";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/* =============================================================================
   POST - Upload file(s) to Google Drive and link to ticket
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

    const tenantId = session.user.activeTenantId;
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: "Aucun tenant actif" }, { status: 403 });
    }

    const { id } = await params;

    // Verify ticket exists and belongs to tenant
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, tenantId },
      select: { id: true, userId: true },
    });

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Billet introuvable" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ ok: false, error: "Content-Type multipart/form-data requis" }, { status: 415 });
    }

    let formData;
    try {
      formData = await request.formData();
    } catch (formError: any) {
      return NextResponse.json({ ok: false, error: `Erreur FormData: ${formError.message}` }, { status: 400 });
    }

    const files = formData.getAll("files");
    const commentId = formData.get("commentId") as string | null;

    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: "Aucun fichier fourni" }, { status: 400 });
    }

    // If commentId provided, verify it belongs to this ticket
    if (commentId) {
      const comment = await prisma.supportTicketComment.findFirst({
        where: { id: commentId, ticketId: id },
        select: { id: true },
      });
      if (!comment) {
        return NextResponse.json({ ok: false, error: "Commentaire introuvable" }, { status: 404 });
      }
    }

    const uploadedAttachments: Array<{
      id: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      fileUrl: string;
      commentId: string | null;
      uploadedAt: string;
    }> = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i] as any;

      if (!file || typeof file.arrayBuffer !== "function" || typeof file.name !== "string") {
        errors.push(`Item ${i} n'est pas un fichier valide`);
        continue;
      }

      if (file.size > 25 * 1024 * 1024) {
        errors.push(`${file.name}: trop volumineux (max 25 Mo)`);
        continue;
      }

      if (file.size === 0) {
        errors.push(`${file.name}: fichier vide`);
        continue;
      }

      let arrayBuffer;
      try {
        arrayBuffer = await file.arrayBuffer();
      } catch {
        errors.push(`${file.name}: erreur de lecture`);
        continue;
      }

      const buffer = Buffer.from(arrayBuffer);

      let driveResult;
      try {
        driveResult = await uploadFileToDrive(buffer, file.name, file.type || "application/octet-stream");
      } catch (driveErr: any) {
        errors.push(`${file.name}: ${driveErr.message}`);
        continue;
      }

      if (!driveResult?.fileId) {
        errors.push(`${file.name}: aucun ID retourné par Google Drive`);
        continue;
      }

      let attachment;
      try {
        attachment = await prisma.supportTicketAttachment.create({
          data: {
            ticketId: id,
            fileName: driveResult.fileName || file.name,
            fileUrl: driveResult.fileId,
            fileSize: file.size,
            mimeType: driveResult.mimeType || file.type || "application/octet-stream",
            commentId: commentId || null,
          },
        });
      } catch (dbErr: any) {
        console.error("DB save failed for attachment:", dbErr);
        await deleteFileFromDrive(driveResult.fileId).catch(console.error);
        errors.push(`${file.name}: erreur base de données`);
        continue;
      }

      uploadedAttachments.push({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        fileUrl: attachment.fileUrl,
        commentId: attachment.commentId,
        uploadedAt: attachment.uploadedAt.toISOString(),
      });
    }

    if (uploadedAttachments.length === 0) {
      const errorMsg = errors.length > 0
        ? `Aucun fichier uploadé. Erreurs: ${errors.join("; ")}`
        : "Aucun fichier n'a pu être sauvegardé.";
      return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `${uploadedAttachments.length} fichier(s) uploadé(s)`,
      attachments: uploadedAttachments,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("POST /api/support/tickets/[id]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur" },
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
      return NextResponse.json({ ok: false, error: "Aucun tenant actif" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId) {
      return NextResponse.json({ ok: false, error: "attachmentId requis" }, { status: 400 });
    }

    // Verify ticket belongs to tenant
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, tenantId },
      select: { id: true, userId: true },
    });

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Billet introuvable" }, { status: 404 });
    }

    // Check permission: Gestionnaire or ticket owner
    const userRole = (session.user as any).role;
    const isGestionnaire = userRole === "Gestionnaire" || session.user.email === "n.labranche@sinto.ca";
    const isOwner = ticket.userId === session.user.id;

    if (!isGestionnaire && !isOwner) {
      return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
    }

    const attachment = await prisma.supportTicketAttachment.findFirst({
      where: { id: attachmentId, ticketId: id },
    });

    if (!attachment) {
      return NextResponse.json({ ok: false, error: "Pièce jointe introuvable" }, { status: 404 });
    }

    // Delete from Google Drive
    try {
      await deleteFileFromDrive(attachment.fileUrl);
    } catch (driveError) {
      console.error("Drive delete error (ignoring):", driveError);
    }

    await prisma.supportTicketAttachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({
      ok: true,
      message: "Pièce jointe supprimée",
    });
  } catch (error: any) {
    console.error("DELETE /api/support/tickets/[id]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
