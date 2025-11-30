// src/app/api/returns/[code]/attachments/route.ts
// File attachments - GET (list), POST (upload), DELETE (remove)
// PostgreSQL version - uses Google Drive for file storage

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { Return, Upload, Attachment } from "@/types/returns";
import { google } from "googleapis";

type RouteParams = { params: Promise<{ code: string }> };

// Initialize Google Drive API
function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}"),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  return google.drive({ version: "v3", auth });
}

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
    const codeRetour = parseInt(code.replace(/^R/i, ""), 10);

    if (isNaN(codeRetour)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    // Get return
    const returns = await query<Return>(
      "SELECT id FROM returns WHERE code_retour = $1",
      [codeRetour]
    );

    if (returns.length === 0) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    // Get attachments
    const uploads = await query<Upload>(
      "SELECT * FROM uploads WHERE return_id = $1 ORDER BY uploaded_at DESC",
      [returns[0].id]
    );

    const attachments: Attachment[] = uploads.map((u) => ({
      id: u.file_path,
      name: u.file_name,
      url: `https://drive.google.com/file/d/${u.file_path}/preview`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${u.file_path}`,
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
    const codeRetour = parseInt(code.replace(/^R/i, ""), 10);

    if (isNaN(codeRetour)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    // Get return
    const returns = await query<Return>(
      "SELECT * FROM returns WHERE code_retour = $1",
      [codeRetour]
    );

    if (returns.length === 0) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    const existing = returns[0];

    // Check if can upload (not finalized unless standby)
    if (existing.is_final && !existing.is_standby) {
      return NextResponse.json(
        { ok: false, error: "Impossible d'ajouter des pièces jointes à un retour finalisé" },
        { status: 400 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Type de fichier non autorisé. Utilisez PDF, JPG ou PNG." },
        { status: 400 }
      );
    }

    // Upload to Google Drive
    const drive = getDriveClient();
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const driveResponse = await drive.files.create({
      requestBody: {
        name: `R${codeRetour}_${file.name}`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || ""],
      },
      media: {
        mimeType: file.type,
        body: require("stream").Readable.from(fileBuffer),
      },
      fields: "id",
    });

    const fileId = driveResponse.data.id;

    if (!fileId) {
      return NextResponse.json(
        { ok: false, error: "Échec de l'upload vers Google Drive" },
        { status: 500 }
      );
    }

    // Make file publicly accessible
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Save to database
    await query(
      `INSERT INTO uploads (return_id, code_retour, file_name, file_path, mime_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        existing.id,
        codeRetour,
        file.name,
        fileId,
        file.type,
        file.size,
        session.user.name || "Système",
      ]
    );

    return NextResponse.json({
      ok: true,
      attachment: {
        id: fileId,
        name: file.name,
        url: `https://drive.google.com/file/d/${fileId}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      },
    });
  } catch (error) {
    console.error("POST /api/returns/[code]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de l'upload du fichier" },
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

    // Role check - Expert and Vérificateur cannot delete
    const userRole = (session.user as { role?: string }).role;
    if (userRole === "Expert" || userRole === "Vérificateur") {
      return NextResponse.json(
        { ok: false, error: "Vous n'êtes pas autorisé à supprimer des pièces jointes" },
        { status: 403 }
      );
    }

    const { code } = await params;
    const codeRetour = parseInt(code.replace(/^R/i, ""), 10);
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (isNaN(codeRetour)) {
      return NextResponse.json({ ok: false, error: "Code retour invalide" }, { status: 400 });
    }

    if (!fileId) {
      return NextResponse.json({ ok: false, error: "ID de fichier requis" }, { status: 400 });
    }

    // Get return
    const returns = await query<Return>(
      "SELECT * FROM returns WHERE code_retour = $1",
      [codeRetour]
    );

    if (returns.length === 0) {
      return NextResponse.json({ ok: false, error: "Retour non trouvé" }, { status: 404 });
    }

    const existing = returns[0];

    // Check if can delete
    if (existing.is_final && !existing.is_standby) {
      return NextResponse.json(
        { ok: false, error: "Impossible de supprimer des pièces jointes d'un retour finalisé" },
        { status: 400 }
      );
    }

    // Delete from Google Drive
    try {
      const drive = getDriveClient();
      await drive.files.delete({ fileId });
    } catch (driveError) {
      console.error("Google Drive delete error:", driveError);
      // Continue with database deletion even if Drive fails
    }

    // Delete from database
    await query(
      "DELETE FROM uploads WHERE return_id = $1 AND file_path = $2",
      [existing.id, fileId]
    );

    return NextResponse.json({ ok: true, message: "Pièce jointe supprimée" });
  } catch (error) {
    console.error("DELETE /api/returns/[code]/attachments error:", error);
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la suppression de la pièce jointe" },
      { status: 500 }
    );
  }
}
