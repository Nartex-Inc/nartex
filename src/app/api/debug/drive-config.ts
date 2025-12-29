// src/app/api/debug/drive-config/route.ts
// Diagnostic endpoint to check Google Drive configuration
// Access at: /api/debug/drive-config

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkDriveConfiguration, listFilesInFolder } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  try {
    // Only allow authenticated users (optional: restrict to admins)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Check basic configuration
    const config = checkDriveConfiguration();
    
    // Environment variable presence check (without revealing values)
    const envCheck = {
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_DRIVE_FOLDER_ID: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
      GOOGLE_CLIENT_EMAIL_preview: process.env.GOOGLE_CLIENT_EMAIL 
        ? `${process.env.GOOGLE_CLIENT_EMAIL.substring(0, 10)}...`
        : null,
      GOOGLE_DRIVE_FOLDER_ID_value: process.env.GOOGLE_DRIVE_FOLDER_ID || null,
    };

    // Try to list files (tests actual API connectivity)
    let apiTest = { success: false, message: "", fileCount: 0 };
    if (config.valid) {
      try {
        const files = await listFilesInFolder(5);
        apiTest = {
          success: true,
          message: "Successfully connected to Google Drive",
          fileCount: files.length
        };
      } catch (apiError: any) {
        apiTest = {
          success: false,
          message: apiError.message || "API call failed",
          fileCount: 0
        };
      }
    }

    return NextResponse.json({
      ok: config.valid && apiTest.success,
      configuration: {
        valid: config.valid,
        errors: config.errors,
      },
      environmentVariables: envCheck,
      apiConnectivity: apiTest,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Drive config check error:", error);
    return NextResponse.json({
      ok: false,
      error: error.message || "Unknown error",
    }, { status: 500 });
  }
}
