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

  // 1. Handle JSON format (if user pasted the whole service-account.json content)
  if (key.trim().startsWith('{')) {
    try {
      const json = JSON.parse(key);
      key = json.private_key;
    } catch (e) {
      // Not valid JSON, continue treating as string
    }
  }

  if (typeof key !== 'string') return undefined;

  // 2. Remove surrounding quotes (common .env artifact)
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }

  // 3. Fix escaped newlines (The most common cause of 1E08010C)
  // Replaces literal "\n" characters with actual line breaks
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }

  return key;
}

const privateKey = getCleanPrivateKey();
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

/* =============================================================================
   Startup Validation (Fail Fast)
============================================================================= */

if (privateKey) {
  try {
    crypto.createPrivateKey(privateKey);
  } catch (error: any) {
    console.error("\n❌ FATAL ERROR: Google Private Key is Malformed");
    console.error("Error Code:", error.message);
    console.error("Does it have real newlines?", privateKey.includes("\n") ? "YES" : "NO");
  }
}

/* =============================================================================
   Auth Setup
============================================================================= */

const SCOPES = ["https://www.googleapis.com/auth/drive"];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
  scopes: SCOPES,
});

const drive = google.drive({ version: "v3", auth });

/* =============================================================================
   Types
============================================================================= */

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  webViewLink: string;
  previewLink: string;
  downloadLink: string;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
}

/* =============================================================================
   Configuration Check Function (Required for Routes)
============================================================================= */

export function checkDriveConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!privateKey) errors.push("GOOGLE_PRIVATE_KEY is not set or invalid");
  if (!clientEmail) errors.push("GOOGLE_CLIENT_EMAIL is not set");
  if (!process.env.GOOGLE_DRIVE_FOLDER_ID) errors.push("GOOGLE_DRIVE_FOLDER_ID is not set");
  return { valid: errors.length === 0, errors };
}

/* =============================================================================
   Upload File to Google Drive
============================================================================= */

export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<DriveUploadResult> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID environment variable.");
  }

  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: "id, name, mimeType, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    const fileId = response.data.id;
    if (!fileId) throw new Error("Google Drive upload failed: No ID returned.");

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

/* =============================================================================
   Delete File from Google Drive
============================================================================= */

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  try {
    await drive.files.delete({ fileId, supportsAllDrives: true });
  } catch (error: any) {
    if (error?.code !== 404) console.error("Delete from Drive Error:", error);
  }
}

/* =============================================================================
   Helpers (Including missing member listFilesInFolder)
============================================================================= */

export async function getFileInfo(fileId: string): Promise<DriveFileInfo | null> {
  try {
    const response = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, webViewLink, size",
      supportsAllDrives: true,
    });
    return {
      id: response.data.id || fileId,
      name: response.data.name || "Unknown",
      mimeType: response.data.mimeType || "application/octet-stream",
      webViewLink: response.data.webViewLink || undefined,
      size: response.data.size || undefined,
    };
  } catch (error: any) {
    if (error?.code === 404) return null;
    throw error;
  }
}

export async function listFilesInFolder(maxResults = 100): Promise<DriveFileInfo[]> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) return [];

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink, size)",
    pageSize: maxResults,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (response.data.files || []).map((file) => ({
    id: file.id || "",
    name: file.name || "Unknown",
    mimeType: file.mimeType || "application/octet-stream",
    webViewLink: file.webViewLink || undefined,
    size: file.size || undefined,
  }));
}

export function getPreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview?rm=minimal&ui=integrated&dscale=1&embedded=true`;
}

export function getDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function getViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
