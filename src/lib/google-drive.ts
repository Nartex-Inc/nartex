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

  // 1. Handle JSON format (if the whole service-account.json was pasted)
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

  // 3. Handle escape scenarios for newlines (\n string vs actual newline)
  // This handles keys coming from AWS Secrets Manager or CI/CD pipelines
  key = key.replace(/\\n/g, '\n');
  key = key.replace(/\r\n/g, '\n');

  // 4. Validate basic structure
  if (!key.includes('-----BEGIN') || !key.includes('-----END')) {
    console.error("❌ GOOGLE_PRIVATE_KEY doesn't have valid PEM headers");
    return undefined;
  }

  // 5. Final validation - RSA keys usually have ~25+ lines
  const newlineCount = (key.match(/\n/g) || []).length;
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
  const config = checkDriveConfiguration();
  if (!config.valid) {
    throw new Error(`Google Drive config error: ${config.errors.join(', ')}`);
  }

  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);

  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId!],
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: "id, name, mimeType, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    const fileId = response.data.id;
    if (!fileId) throw new Error("No file ID returned");

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

export function getPreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function getDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function getViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
