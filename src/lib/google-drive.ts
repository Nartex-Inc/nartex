// src/lib/google-drive.ts
import { google } from "googleapis";
import { Readable } from "stream";
import crypto from "crypto";

/* =============================================================================
   Configuration & Key Cleaning Logic
============================================================================= */

function getCleanPrivateKey() {
  let key = process.env.GOOGLE_PRIVATE_KEY;
  
  if (!key) {
    console.error("❌ GOOGLE_PRIVATE_KEY is missing from environment variables.");
    return undefined;
  }

  // 1. Extract from JSON if the whole object was passed
  if (key.trim().startsWith('{')) {
    try {
      const json = JSON.parse(key);
      key = json.private_key || json.GOOGLE_PRIVATE_KEY || key;
    } catch (e) { /* continue */ }
  }

  if (typeof key !== 'string') return undefined;

  // 2. Remove surrounding quotes
  key = key.trim().replace(/^["']|["']$/g, '');

  // 3. CRITICAL: Fix literal "\n" strings into real line breaks
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }

  return key;
}

const privateKey = getCleanPrivateKey();
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

/* =============================================================================
   Startup Validation (Fail Fast)
============================================================================= */

if (privateKey) {
  try {
    crypto.createPrivateKey(privateKey);
  } catch (error: any) {
    console.error("\n❌ FATAL ERROR: Google Private Key is Malformed (DECODER Error)");
    console.error("Error Detail:", error.message);
  }
}

/* =============================================================================
   Auth Setup
============================================================================= */

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

/* =============================================================================
   Exported Members (Required for Build)
============================================================================= */

export function checkDriveConfiguration(): { valid: boolean; errors: string[] } {
  const errors = [];
  if (!privateKey) errors.push("GOOGLE_PRIVATE_KEY is missing or invalid");
  if (!clientEmail) errors.push("GOOGLE_CLIENT_EMAIL is missing");
  if (!folderId) errors.push("GOOGLE_DRIVE_FOLDER_ID is missing");
  return { valid: errors.length === 0, errors };
}

export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<any> {
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  try {
    const response = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId!] },
      media: { mimeType, body: stream },
      fields: "id, name, mimeType, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    const fileId = response.data.id!;
    return {
      fileId,
      fileName: response.data.name || fileName,
      mimeType: response.data.mimeType || mimeType,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      previewLink: `https://drive.google.com/file/d/${fileId}/preview?rm=minimal&ui=integrated&dscale=1&embedded=true`,
      downloadLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  } catch (error: any) {
    throw new Error(`Google Drive API Error: ${error.message}`);
  }
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  try {
    await drive.files.delete({ fileId, supportsAllDrives: true });
  } catch (error: any) {
    if (error?.code !== 404) console.error("Delete Error:", error);
  }
}

export async function listFilesInFolder(maxResults = 100): Promise<any[]> {
  if (!folderId) return [];
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink, size)",
    pageSize: maxResults,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return (response.data.files || []).map(f => ({
    id: f.id || "",
    name: f.name || "Unknown",
    mimeType: f.mimeType || "application/octet-stream",
    webViewLink: f.webViewLink || undefined,
    size: f.size || undefined,
  }));
}

export async function getFileInfo(fileId: string): Promise<any | null> {
  try {
    const response = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, webViewLink, size",
      supportsAllDrives: true,
    });
    return response.data;
  } catch (error: any) {
    if (error?.code === 404) return null;
    throw error;
  }
}

export const getPreviewUrl = (id: string) => `https://drive.google.com/file/d/${id}/preview?rm=minimal&ui=integrated&dscale=1&embedded=true`;
export const getDownloadUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;
export const getViewUrl = (id: string) => `https://drive.google.com/file/d/${id}/view`;
