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
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

/* =============================================================================
   Startup Validation (Fail Fast)
============================================================================= */

// Check for missing environment variables
const missingEnvVars: string[] = [];
if (!privateKey) missingEnvVars.push('GOOGLE_PRIVATE_KEY');
if (!clientEmail) missingEnvVars.push('GOOGLE_CLIENT_EMAIL');
if (!folderId) missingEnvVars.push('GOOGLE_DRIVE_FOLDER_ID');

if (missingEnvVars.length > 0) {
  console.error(`\n❌ GOOGLE DRIVE CONFIG ERROR: Missing environment variables: ${missingEnvVars.join(', ')}`);
  console.error("File uploads will fail until these are configured.\n");
}

// This block runs immediately when the server starts or this file is imported.
// It checks if the key is valid BEFORE you try to upload a file.
let keyIsValid = false;
if (privateKey) {
  try {
    // Attempt to parse the key using Node's crypto library
    crypto.createPrivateKey(privateKey);
    keyIsValid = true;
    console.log("✅ Google Drive: Private Key format is valid.");
  } catch (error: any) {
    console.error("\n❌ FATAL ERROR: Google Private Key is Malformed");
    console.error("---------------------------------------------------");
    console.error("Error Code:", error.message);
    console.error("Key received starts with:", `"${privateKey.substring(0, 30)}..."`);
    console.error("Key received ends with:", `"...${privateKey.substring(privateKey.length - 30)}"` || "Empty");
    console.error("Does it have real newlines?", privateKey.includes("\n") ? "YES" : "NO (This is the problem!)");
    console.error("---------------------------------------------------\n");
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
   Configuration Check Function
============================================================================= */

export function checkDriveConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!privateKey) errors.push("GOOGLE_PRIVATE_KEY is not set");
  if (!clientEmail) errors.push("GOOGLE_CLIENT_EMAIL is not set");
  if (!folderId) errors.push("GOOGLE_DRIVE_FOLDER_ID is not set");
  if (privateKey && !keyIsValid) errors.push("GOOGLE_PRIVATE_KEY is malformed");
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/* =============================================================================
   Upload File to Google Drive
============================================================================= */

export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<DriveUploadResult> {
  console.log(`[Google Drive] uploadFileToDrive called: ${fileName} (${mimeType}, ${fileBuffer.length} bytes)`);
  
  // Pre-flight configuration check
  const config = checkDriveConfiguration();
  if (!config.valid) {
    const errorMsg = `Google Drive configuration error: ${config.errors.join(', ')}`;
    console.error(`[Google Drive] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  
  if (!targetFolderId) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID environment variable.");
  }

  console.log(`[Google Drive] Target folder ID: ${targetFolderId}`);

  // Create a readable stream from the buffer
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  try {
    console.log(`[Google Drive] Calling drive.files.create...`);
    
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [targetFolderId],
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: "id, name, mimeType, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    console.log(`[Google Drive] API response status: ${response.status}`);
    console.log(`[Google Drive] API response data:`, response.data);

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error("Google Drive upload succeeded but no ID was returned.");
    }

    const result = {
      fileId,
      fileName: response.data.name || fileName,
      mimeType: response.data.mimeType || mimeType,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      previewLink: `https://drive.google.com/file/d/${fileId}/preview?rm=minimal&ui=integrated&dscale=1&embedded=true`,
      downloadLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
    
    console.log(`[Google Drive] Upload successful:`, result);
    return result;
    
  } catch (error: any) {
    // Enhance error message for debugging
    console.error("[Google Drive] Upload Error Details:", error);
    
    // Check for common error types
    if (error.message && error.message.includes("DECODER routines::unsupported")) {
      throw new Error("Configuration Error: The GOOGLE_PRIVATE_KEY is invalid. Check server logs for details.");
    }
    
    if (error.code === 403) {
      throw new Error(`Google Drive permission error: The service account may not have access to the folder. Error: ${error.message}`);
    }
    
    if (error.code === 404) {
      throw new Error(`Google Drive folder not found: Check that GOOGLE_DRIVE_FOLDER_ID (${targetFolderId}) is correct.`);
    }
    
    if (error.code === 401) {
      throw new Error(`Google Drive authentication error: Check GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.`);
    }
    
    throw new Error(`Google Drive API Error: ${error.message || 'Unknown error'}`);
  }
}

/* =============================================================================
   Delete File from Google Drive
============================================================================= */

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  try {
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });
  } catch (error: any) {
    if (error?.code === 404) {
      console.warn(`File ${fileId} not found in Google Drive (already deleted?)`);
      return;
    }
    console.error("Delete from Drive Error:", error);
    // Don't throw here to allow DB deletion to proceed
  }
}

/* =============================================================================
   Helpers
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
  const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!targetFolderId) return [];

  const response = await drive.files.list({
    q: `'${targetFolderId}' in parents and trashed = false`,
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
