// src/lib/google-drive.ts
import { google } from "googleapis";
import { Readable } from "stream";
import crypto from "crypto";

/* =============================================================================
   Configuration & Key Cleaning Logic
============================================================================= */

/**
 * Specifically cleans the GOOGLE_PRIVATE_KEY to ensure it is a valid PEM format.
 * This function converts literal "\n" strings into real cryptographic line breaks
 * to prevent the "error:1E08010C:DECODER routines::unsupported" failure.
 */
function getCleanPrivateKey(): string | undefined {
  let key = process.env.GOOGLE_PRIVATE_KEY;
  
  if (!key) {
    console.error("❌ GOOGLE_PRIVATE_KEY is missing from environment variables.");
    return undefined;
  }

  // 1. Handle JSON format (accidental full service-account.json paste)
  if (key.trim().startsWith('{')) {
    try {
      const json = JSON.parse(key);
      key = json.private_key || json.GOOGLE_PRIVATE_KEY || key;
    } catch (e) { 
      /* continue treating as string if parsing fails */ 
    }
  }

  if (typeof key !== 'string') return undefined;

  // 2. Remove surrounding quotes (common .env artifact)
  key = key.trim().replace(/^["']|["']$/g, '');

  // 3. CRITICAL DECODER FIX: Translate literal text "\n" into real line breaks.
  // OpenSSL requires physical multi-line formatting for PEM keys.
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
    // Force-test the key structure using Node's crypto library before app starts
    crypto.createPrivateKey(privateKey);
    console.log("✅ Google Drive: Private Key format is valid.");
  } catch (error: any) {
    console.error("\n❌ FATAL ERROR: Google Private Key is Malformed (DECODER Error)");
    console.error("Error Detail:", error.message);
    console.error("Hint: Ensure your AWS Secret is minified JSON and not a raw string.\n");
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
   Exported Members (Required for Build & API)
============================================================================= */

/**
 * Validates drive configuration for diagnostic routes.
 */
export function checkDriveConfiguration(): { valid: boolean; errors: string[] } {
  const errors = [];
  if (!privateKey) errors.push("GOOGLE_PRIVATE_KEY is missing or invalid");
  if (!clientEmail) errors.push("GOOGLE_CLIENT_EMAIL is missing");
  if (!folderId) errors.push("GOOGLE_DRIVE_FOLDER_ID is missing");
  return { valid: errors.length === 0, errors };
}

/**
 * Uploads a file buffer to the configured Google Drive folder.
 */
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<any> {
  if (!folderId) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID");

  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  try {
    const response = await drive.files.create({
      requestBody: { 
        name: fileName, 
        parents: [folderId] 
      },
      media: { 
        mimeType: mimeType, 
        body: stream 
      },
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

/**
 * Deletes a specific file from Google Drive.
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  try {
    await drive.files.delete({ 
      fileId, 
      supportsAllDrives: true 
    });
  } catch (error: any) {
    if (error?.code !== 404) {
      console.error("Drive Delete Error:", error);
    }
  }
}

/**
 * Lists files in the target folder for debug/listing routes.
 */
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

/**
 * Retrieves metadata for a single file.
 */
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

// URL Helper Exports
export const getPreviewUrl = (id: string) => `https://drive.google.com/file/d/${id}/preview?rm=minimal&ui=integrated&dscale=1&embedded=true`;
export const getDownloadUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;
export const getViewUrl = (id: string) => `https://drive.google.com/file/d/${id}/view`;
