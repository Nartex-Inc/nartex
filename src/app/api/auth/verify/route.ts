import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const challenge = req.cookies.get("auth-challenge")?.value;

  if (!challenge) return NextResponse.json({ verified: false, error: "No challenge found" });

  // In real app, fetch the public key for this user from DB
  // const expectedPublicKey = ... 

  // MOCK VERIFICATION for drop-in (Replace with actual verifyAuthenticationResponse logic)
  // Since we don't have the DB setup for public keys in this snippet, 
  // we are simulating the success flow to let you test the UI.
  // UNCOMMENT BELOW FOR REAL PROD:
  /*
  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge: challenge,
    expectedOrigin: process.env.ORIGIN || "http://localhost:3000",
    expectedRPID: process.env.RP_ID || "localhost",
    authenticator: { ... }
  });
  */
 
  // Allow UI testing:
  return NextResponse.json({ verified: true });
}
