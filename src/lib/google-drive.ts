import { google } from "googleapis";
import { Readable } from "stream";

/* =============================================================================
   Configuration & Key Cleaning Logic
============================================================================= */

function getCleanPrivateKey(): string | undefined {
  let key = process.env.GOOGLE_PRIVATE_KEY;
  
  if (!key) {
    console.error("❌ GOOGLE_PRIVATE_KEY is missing from environment variables.");
    return undefined;
  }

  // 1. Handle JSON format (if user pasted the whole service-account.json content)
  if (key.trim().startsWith('{')) {
    try {
      const json = JSON.parse(key);
      key = json.private_key || key;
      console.log("[Google Drive] Extracted key from JSON format");
    } catch (e) {
      // Not valid JSON, continue treating as string
    }
  }

  if (typeof key !== 'string') return undefined;

  // 2. Remove surrounding quotes
  key = key.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // 3. Fix escaped newlines (literal "\n" -> real newline)
  key = key.replace(/\\n/g, '\n');
  key = key.replace(/\r\n/g, '\n');

  // 4. Validate basic structure
  if (!key.includes('-----BEGIN') || !key.includes('-----END')) {
    console.error("❌ GOOGLE_PRIVATE_KEY doesn't have valid PEM headers");
    return undefined;
  }

  return key;
}

const privateKey = getCleanPrivateKey();
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

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
   Exported Types
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
   Exported Functions
============================================================================= */

export function checkDriveConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!privateKey) errors.push("GOOGLE_PRIVATE_KEY is missing or invalid");
  if (!clientEmail) errors.push("GOOGLE_CLIENT_EMAIL is missing");
  if (!folderId) errors.push("GOOGLE_DRIVE_FOLDER_ID is missing");
  return { valid: errors.length === 0, errors };
}

export async function uploadFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<DriveUploadResult> {
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
      previewLink: `https://drive.google.com/file/d/${fileId}/preview`,
      downloadLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  } catch (error: any) {
    throw new Error(`Upload Failed: ${error.message}`);
  }
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  try {
    await drive.files.delete({ fileId, supportsAllDrives: true });
  } catch (error: any) {
    if (error?.code !== 404) console.error("Delete error:", error);
  }
}

export async function listFilesInFolder(maxResults = 100): Promise<DriveFileInfo[]> {
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
    mimeType: f.mimeType || "",
    webViewLink: f.webViewLink || undefined,
    size: f.size || undefined,
  }));
}

export function getPreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function getDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function getViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
