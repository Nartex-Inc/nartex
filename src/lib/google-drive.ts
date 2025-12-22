// src/lib/google-drive.ts
// Google Drive API integration for file uploads using Service Account
//
// Required environment variables:
// - GOOGLE_CLIENT_EMAIL: Service account email
// - GOOGLE_PRIVATE_KEY: Service account private key (with \n escaped)
// - GOOGLE_DRIVE_FOLDER_ID: Shared Drive folder ID for uploads

import { google } from "googleapis";
import { Readable } from "stream";

/* =============================================================================
   Configuration & Auth
============================================================================= */

const SCOPES = ["https://www.googleapis.com/auth/drive"];

/**
 * Clean the private key to ensure it has real newlines.
 * Handles cases where \n comes in as literal characters.
 */
function getCleanPrivateKey() {
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!key) return undefined;
  
  // Replace literal string "\n" with actual newline character
  return key.replace(/\\n/g, "\n");
}

function getAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = getCleanPrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Google Drive credentials. Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY."
    );
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: SCOPES,
  });
}

function getDriveService() {
  const auth = getAuth();
  return google.drive({ version: "v3", auth });
}

function getFolderId(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID environment variable.");
  }
  return folderId;
}

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
   Upload File to Google Drive
============================================================================= */

/**
 * Upload a file to Google Drive shared folder
 * @param fileBuffer - The file content as a Buffer
 * @param fileName - Original file name
 * @param mimeType - MIME type of the file
 * @returns Upload result with file ID and links
 */
export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<DriveUploadResult> {
  const drive = getDriveService();
  const folderId = getFolderId();

  // Create a readable stream from the buffer
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  // File metadata
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  try {
    // Upload the file
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: "id, name, mimeType, webViewLink, webContentLink",
      supportsAllDrives: true, // Required for Shared Drives
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error("Failed to upload file to Google Drive - no file ID returned");
    }

    return {
      fileId,
      fileName: response.data.name || fileName,
      mimeType: response.data.mimeType || mimeType,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      // Construct a preview link manually as it's often more reliable for embedding
      previewLink: `https://drive.google.com/file/d/${fileId}/preview?rm=minimal&ui=integrated&dscale=1&embedded=true`,
      downloadLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  } catch (error: any) {
    console.error("Google Drive Upload Error:", error);
    throw new Error(`Google Drive Upload Failed: ${error.message}`);
  }
}

/* =============================================================================
   Delete File from Google Drive
============================================================================= */

/**
 * Delete a file from Google Drive
 * @param fileId - The Google Drive file ID
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveService();

  try {
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });
  } catch (error: any) {
    // If file not found, consider it already deleted
    if (error?.code === 404) {
      console.warn(`File ${fileId} not found in Google Drive (already deleted?)`);
      return;
    }
    throw error;
  }
}

/* =============================================================================
   Get File Info from Google Drive
============================================================================= */

/**
 * Get file information from Google Drive
 * @param fileId - The Google Drive file ID
 */
export async function getFileInfo(fileId: string): Promise<DriveFileInfo | null> {
  const drive = getDriveService();

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
    if (error?.code === 404) {
      return null;
    }
    throw error;
  }
}

/* =============================================================================
   List Files in Folder
============================================================================= */

/**
 * List files in the configured Google Drive folder
 * @param maxResults - Maximum number of files to return
 */
export async function listFilesInFolder(maxResults = 100): Promise<DriveFileInfo[]> {
  const drive = getDriveService();
  const folderId = getFolderId();

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

/* =============================================================================
   Generate Preview/Embed URLs
============================================================================= */

/**
 * Generate Google Drive preview iframe URL
 * This URL can be used in an iframe to display the file
 */
export function getPreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview?rm=minimal&ui=integrated&dscale=1&embedded=true`;
}

/**
 * Generate Google Drive download URL
 */
export function getDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Generate Google Drive view URL
 */
export function getViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
