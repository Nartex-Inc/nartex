import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; 

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Determine RP ID based on environment
  let rpID = process.env.RP_ID;
  if (!rpID) {
    rpID = process.env.NODE_ENV === 'production' ? 'app.nartex.ca' : 'localhost';
  }

  const userEmail = session.user?.email || 'unknown-user';
  
  // FIX: Convert string email to Uint8Array as required by the library
  const userID = new TextEncoder().encode(userEmail);

  // WE USE REGISTRATION OPTIONS TO FORCE THE PLATFORM AUTHENTICATOR
  // The 'as any' cast is still safer to keep to avoid version mismatches on optional fields
  const options = await generateRegistrationOptions({
    rpName: 'Nartex Catalogue',
    rpID: rpID,
    userID: userID, // <--- NOW A VALID UINT8ARRAY
    userName: userEmail,
    // Force Platform Authenticator (FaceID / Windows Hello)
    authenticatorSelection: {
      authenticatorAttachment: 'platform', 
      userVerification: 'required',
      residentKey: 'preferred',
    },
  } as any);
  
  const response = NextResponse.json(options);
  
  // Save challenge in cookie
  response.cookies.set("auth-challenge", options.challenge, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 5 
  });
  
  return response;
}
