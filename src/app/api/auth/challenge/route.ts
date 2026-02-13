import { NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
} from "@simplewebauthn/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const forceRegister = searchParams.get("register") === "true";

  let rpID = process.env.RP_ID;
  if (!rpID) {
    rpID =
      process.env.NODE_ENV === "production" ? "app.nartex.ca" : "localhost";
  }

  const userEmail = session.user.email;

  // Check if user already has a stored WebAuthn credential
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { webauthnCredentials: true },
  });

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existingCreds = user.webauthnCredentials;

  let challenge: string;
  let responseBody: Record<string, unknown>;

  if (existingCreds.length > 0 && !forceRegister) {
    // AUTHENTICATION flow — user already registered, go straight to Windows Hello
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      allowCredentials: existingCreds.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports as AuthenticatorTransport[],
      })),
    });

    challenge = options.challenge;
    responseBody = { type: "authenticate", options };
  } else {
    // REGISTRATION flow — first time only
    const userID = new TextEncoder().encode(userEmail);

    const options = await generateRegistrationOptions({
      rpName: "Nartex Catalogue",
      rpID,
      userID,
      userName: userEmail,
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "discouraged",
      },
      attestation: "none",
    } as Parameters<typeof generateRegistrationOptions>[0]);

    challenge = options.challenge;
    responseBody = { type: "register", options };
  }

  const response = NextResponse.json(responseBody);

  response.cookies.set("auth-challenge", challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 5,
  });

  return response;
}
