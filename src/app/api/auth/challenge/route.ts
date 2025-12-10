import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Your auth config

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Get user's registered Credential IDs from your DB
  // const userAuthenticators = await db.query('SELECT credentialID FROM authenticators WHERE userId = ...');
  // const allowCredentials = userAuthenticators.map(auth => ({
  //   id: auth.credentialID,
  //   type: 'public-key',
  //   transports: ['internal'], // 'internal' usually targets TouchID/FaceID
  // }));

  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID || "localhost", // Must match your domain (e.g., 'app.nartex.ca')
    userVerification: "required", // THIS FORCES FACEID / PIN
    // allowCredentials, // Uncomment this line once you hook up your DB
  });

  // Store 'options.challenge' in a DB or HttpOnly cookie to verify later
  // For this demo, we return it directly, but in prod, save it to session!
  
  return NextResponse.json(options);
}
