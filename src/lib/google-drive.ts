import { google } from "googleapis";
import { Readable } from "stream";
import crypto from "crypto";

/* =============================================================================
   Configuration & Key Cleaning Logic
============================================================================= */

function getCleanPrivateKey(): string | undefined {
  let key = process.env.GOOGLE_PRIVATE_KEY;
  
  if (!key) {
    console.error("❌ GOOGLE_PRIVATE_KEY is missing from environment variables.");
    return undefined;
  }

  // 1. Handle JSON format (accidental full JSON paste)
  if (key.trim().startsWith('{')) {
    try {
      const json = JSON.parse(key);
      key = json.private_key || key;
    } catch (e) { /* ignore */ }
  }

  if (typeof key !== 'string') return undefined;

  // 2. Remove surrounding quotes
  key = key.trim().replace(/^["']|["']$/g, '');

  // 3. FIX: Convert literal "\n" strings into actual newline characters
  // This is the specific fix for error:1E08010C:DECODER routines::unsupported
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }

  return key;
}

const privateKey = getCleanPrivateKey();
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

/* =============================================================================
   Validation & Setup
============================================================================= */

if (privateKey) {
  try {
    crypto.createPrivateKey(privateKey);
    console.log("✅ Google Drive: Private Key validated successfully.");
  } catch (error: any) {
    console.error("❌ Google Private Key is Malformed:", error.message);
  }
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

/* =============================================================================
   Exported Functions (Required for Routes & Build)
============================================================================= */

export function checkDriveConfiguration() {
  const errors = [];
  if (!privateKey) errors.push("GOOGLE_PRIVATE_KEY invalid");
  if (!clientEmail) errors.push("GOOGLE_CLIENT_EMAIL missing");
  if (!folderId) errors.push("GOOGLE_DRIVE_FOLDER_ID missing");
  return { valid: errors.length === 0, errors };
}

export async function uploadFileToDrive(fileBuffer: Buffer, fileName: string, mimeType: string) {
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  try {
    const response = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId!] },
      media: { mimeType, body: stream },
      fields: "id, name, mimeType, webViewLink",
      supportsAllDrives: true,
    });

    const fileId = response.data.id!;
    return {
      fileId,
      fileName: response.data.name || fileName,
      mimeType: response.data.mimeType || mimeType,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      previewLink: `https://drive.google.com/file/d/${fileId}/preview?rm=minimal&ui=integrated&embedded=true`,
      downloadLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  } catch (error: any) {
    throw new Error(`Google Drive API Error: ${error.message}`);
  }
}

export async function listFilesInFolder(maxResults = 100) {
  if (!folderId) return [];
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink, size)",
    pageSize: maxResults,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return response.data.files || [];
}

export async function deleteFileFromDrive(fileId: string) {
  try {
    await drive.files.delete({ fileId, supportsAllDrives: true });
  } catch (error: any) {
    if (error?.code !== 404) console.error("Drive Delete Error:", error);
  }
}

// Helpers for URLs
export const getPreviewUrl = (id: string) => `https://drive.google.com/file/d/${id}/preview?rm=minimal&ui=integrated&embedded=true`;
export const getDownloadUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;
export const getViewUrl = (id: string) => `https://drive.google.com/file/d/${id}/view`;
