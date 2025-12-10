import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const challenge = req.cookies.get("auth-challenge")?.value;

  if (!challenge) return NextResponse.json({ verified: false, error: "No challenge found" });

  let rpID = process.env.RP_ID;
  if (!rpID) {
    rpID = process.env.NODE_ENV === 'production' ? 'app.nartex.ca' : 'localhost';
  }

  // In a real app with DB, we would verify against the DB. 
  // Here we verify the crypto signature logic only.
  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: process.env.ORIGIN || (process.env.NODE_ENV === 'production' ? "https://app.nartex.ca" : "http://localhost:3000"),
      expectedRPID: rpID,
    });

    if (verification.verified) {
      return NextResponse.json({ verified: true });
    }
  } catch (e) {
    console.error("Verification failed", e);
  }

  return NextResponse.json({ verified: false }, { status: 400 });
}
