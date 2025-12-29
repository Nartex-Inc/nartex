// src/lib/google-drive.ts v2
import { google } from "googleapis";
import { Readable } from "stream";

/* =============================================================================
   Configuration & Key Cleaning Logic
============================================================================= */

function getCleanPrivateKey(): string | undefined {
  let key = process.env.GOOGLE_PRIVATE_KEY;
  
  if (!key) {
    console.error("❌ GOOGLE_PRIVATE_KEY is missing.");
    return undefined;
  }

  // Handle case where the whole secret might be wrapped in quotes
  key = key.trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }

  // Fix escaped newlines: convert literal "\n" strings into actual line breaks
  // This is the most common fix for the DECODER error.
  key = key.replace(/\\n/gm, '\n');

  // Validate basic PEM structure
  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error("❌ Key format invalid: Missing BEGIN header.");
    return undefined;
  }

  return key;
}

  // 2. Handle JSON format (if user pasted the whole service-account.json content)
  if (key.trim().startsWith('{')) {
    try {
      const json = JSON.parse(key);
      key = json.private_key;
      console.log("[Google Drive] Extracted key from JSON format");
    } catch (e) {
      // Not valid JSON, continue treating as string
    }
  }

  if (typeof key !== 'string') return undefined;

  // 3. Remove surrounding quotes
  key = key.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // 4. Handle ALL possible escape scenarios for newlines
  // This handles keys that went through multiple shell expansions
  key = key.replace(/\\\\\\n/g, '\n');  // Triple escaped
  key = key.replace(/\\\\n/g, '\n');     // Double escaped  
  key = key.replace(/\\n/g, '\n');       // Single escaped
  key = key.replace(/\r\n/g, '\n');      // Windows
  key = key.replace(/\r/g, '\n');

  // Count newlines after processing
  const newlineCount = (key.match(/\n/g) || []).length;
  console.log("[Google Drive] After processing - newline count:", newlineCount);

  // 5. Validate basic structure
  if (!key.includes('-----BEGIN') || !key.includes('-----END')) {
    console.error("❌ GOOGLE_PRIVATE_KEY doesn't have valid PEM headers");
    console.error("First 50 chars:", key.substring(0, 50));
    return undefined;
  }

  // 6. Final validation - key should have ~27 lines for RSA
  if (newlineCount < 5) {
    console.error("❌ Key appears to be missing newlines. Got:", newlineCount);
    return undefined;
  }

  console.log("✅ Private key processed successfully");
  return key;
}

const privateKey = getCleanPrivateKey();
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

/* =============================================================================
   Startup Validation
============================================================================= */

const missingEnvVars: string[] = [];
if (!privateKey) missingEnvVars.push('GOOGLE_PRIVATE_KEY');
if (!clientEmail) missingEnvVars.push('GOOGLE_CLIENT_EMAIL');
if (!folderId) missingEnvVars.push('GOOGLE_DRIVE_FOLDER_ID');

if (missingEnvVars.length > 0) {
  console.error(`\n❌ GOOGLE DRIVE CONFIG ERROR: ${missingEnvVars.join(', ')}\n`);
} else {
  console.log("✅ Google Drive: Configuration OK");
  console.log("   Client Email:", clientEmail);
  console.log("   Folder ID:", folderId);
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
  if (!privateKey) errors.push("GOOGLE_PRIVATE_KEY is not set or invalid");
  if (!clientEmail) errors.push("GOOGLE_CLIENT_EMAIL is not set");
  if (!folderId) errors.push("GOOGLE_DRIVE_FOLDER_ID is not set");
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
  console.log(`[Google Drive] Upload: ${fileName} (${mimeType}, ${fileBuffer.length} bytes)`);
  
  const config = checkDriveConfiguration();
  if (!config.valid) {
    throw new Error(`Google Drive config error: ${config.errors.join(', ')}`);
  }

  const targetFolderId = folderId!;
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  try {
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

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error("Upload succeeded but no file ID returned");
    }

    console.log(`[Google Drive] ✅ Uploaded: ${fileId}`);
    
    return {
      fileId,
      fileName: response.data.name || fileName,
      mimeType: response.data.mimeType || mimeType,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      previewLink: `https://drive.google.com/file/d/${fileId}/preview`,
      downloadLink: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
    
  } catch (error: any) {
    console.error("[Google Drive] Upload failed:", error.message);
    
    if (error.message?.includes("invalid_grant") || error.message?.includes("Invalid JWT")) {
      throw new Error("Auth failed - check GOOGLE_PRIVATE_KEY format in server logs");
    }
    if (error.code === 403) {
      throw new Error(`Permission denied - service account needs access to folder`);
    }
    if (error.code === 404) {
      throw new Error(`Folder not found - check GOOGLE_DRIVE_FOLDER_ID`);
    }
    
    throw new Error(`Google Drive Error: ${error.message}`);
  }
}

/* =============================================================================
   Delete File from Google Drive
============================================================================= */

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  try {
    await drive.files.delete({ fileId, supportsAllDrives: true });
  } catch (error: any) {
    if (error?.code === 404) return;
    console.error("Delete error:", error);
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
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function getDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function getViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
