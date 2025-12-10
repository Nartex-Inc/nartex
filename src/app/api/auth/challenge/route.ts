import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; 

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let rpID = process.env.RP_ID;
  if (!rpID) {
    rpID = process.env.NODE_ENV === 'production' ? 'app.nartex.ca' : 'localhost';
  }

  // WE USE REGISTRATION OPTIONS TO FORCE THE PLATFORM AUTHENTICATOR
  const options = await generateRegistrationOptions({
    rpName: 'Nartex Catalogue',
    rpID: rpID,
    userID: session.user?.email || 'unknown-user',
    userName: session.user?.email || 'User',
    // THIS IS THE MAGIC PART THAT WAS IGNORED BEFORE:
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // <--- Forces Windows Hello / FaceID
      userVerification: 'required',
      residentKey: 'preferred',
    },
  });
  
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
