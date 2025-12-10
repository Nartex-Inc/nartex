import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; 

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // In a real app, query DB for user's registered authenticators here
  // const userAuthenticators = ...

  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID || "localhost", // Change to your production domain (e.g. app.nartex.ca)
    userVerification: "required", // THIS FORCES FACEID/PIN
    allowCredentials: [], // Pass registered credential IDs here if restricting to specific devices
  });

  // TODO: Save options.challenge to a cookie or DB session to verify later!
  // For this example, we proceed statelessly (less secure, but works for demo)
  
  const response = NextResponse.json(options);
  // Set challenge in a cookie for verification step
  response.cookies.set("auth-challenge", options.challenge, { httpOnly: true, secure: true });
  
  return response;
}
