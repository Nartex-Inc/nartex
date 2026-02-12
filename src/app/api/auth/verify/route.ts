import { NextRequest, NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ verified: false, error: "Unauthorized" });

  const { type, response: authResponse } = await req.json();
  const challenge = req.cookies.get("auth-challenge")?.value;

  if (!challenge)
    return NextResponse.json({
      verified: false,
      error: "No challenge found",
    });

  let rpID = process.env.RP_ID;
  if (!rpID) {
    rpID =
      process.env.NODE_ENV === "production" ? "app.nartex.ca" : "localhost";
  }

  const expectedOrigin =
    process.env.ORIGIN ||
    (process.env.NODE_ENV === "production"
      ? "https://app.nartex.ca"
      : "http://localhost:3000");

  try {
    if (type === "register") {
      // REGISTRATION verification — first time, store the credential
      const verification = await verifyRegistrationResponse({
        response: authResponse,
        expectedChallenge: challenge,
        expectedOrigin,
        expectedRPID: rpID,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;

        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
        });

        if (user) {
          await prisma.webAuthnCredential.create({
            data: {
              userId: user.id,
              credentialId: credential.id,
              publicKey: Buffer.from(credential.publicKey),
              counter: BigInt(credential.counter),
              transports: authResponse.response?.transports || [],
            },
          });
        }

        return NextResponse.json({ verified: true });
      }
    } else if (type === "authenticate") {
      // AUTHENTICATION verification — subsequent uses, verify against stored credential
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { webauthnCredentials: true },
      });

      if (!user || user.webauthnCredentials.length === 0) {
        return NextResponse.json({
          verified: false,
          error: "No credential found",
        });
      }

      // Find the matching credential
      const storedCred = user.webauthnCredentials.find(
        (c) => c.credentialId === authResponse.id
      );

      if (!storedCred) {
        return NextResponse.json({
          verified: false,
          error: "Credential not recognized",
        });
      }

      const verification = await verifyAuthenticationResponse({
        response: authResponse,
        expectedChallenge: challenge,
        expectedOrigin,
        expectedRPID: rpID,
        credential: {
          id: storedCred.credentialId,
          publicKey: new Uint8Array(storedCred.publicKey),
          counter: Number(storedCred.counter),
          transports: storedCred.transports as AuthenticatorTransport[],
        },
      });

      if (verification.verified) {
        // Update counter to prevent replay attacks
        await prisma.webAuthnCredential.update({
          where: { id: storedCred.id },
          data: {
            counter: BigInt(verification.authenticationInfo.newCounter),
          },
        });

        return NextResponse.json({ verified: true });
      }
    }
  } catch (e) {
    console.error("WebAuthn verification failed", e);
  }

  return NextResponse.json({ verified: false }, { status: 400 });
}
