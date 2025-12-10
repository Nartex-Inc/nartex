import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; 

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- CRITICAL FIX START ---
  // We determine the rpID based on where the app is running.
  // In production (app.nartex.ca), we MUST use "app.nartex.ca"
  // In development (localhost), we MUST use "localhost"
  
  // 1. Try to get it from Environment Variable
  let rpID = process.env.RP_ID;

  // 2. If not set, detect based on Node Environment
  if (!rpID) {
    rpID = process.env.NODE_ENV === 'production' ? 'app.nartex.ca' : 'localhost';
  }
  // --- CRITICAL FIX END ---

  const options = await generateAuthenticationOptions({
    rpID: rpID, 
    userVerification: "required", // Forces FaceID/PIN
    allowCredentials: [],
  });
  
  const response = NextResponse.json(options);
  
  // Save challenge in a secure, http-only cookie for verification later
  response.cookies.set("auth-challenge", options.challenge, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 5 // 5 minutes
  });
  
  return response;
}
