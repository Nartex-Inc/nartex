// src/app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success, retryAfterMs } = rateLimit({
    key: `verify-email:${ip}`,
    limit: 10,
    windowMs: 15 * 60_000,
  });

  if (!success) {
    return rateLimitResponse(retryAfterMs);
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: "Jeton manquant ou invalide." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Jeton invalide ou expiré." }, { status: 400 });
    }

    // Enforce token expiration (ISO-27001: time-limited verification)
    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      return NextResponse.json({
        success: false,
        error: "Ce lien de vérification a expiré. Veuillez demander un nouveau lien.",
        expired: true,
      }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    return NextResponse.json({ success: true, message: "E-mail vérifié avec succès !" });

  } catch (error: any) {
    console.error("EMAIL VERIFICATION API ERROR:", error);
    return NextResponse.json({ success: false, error: "Erreur lors de la vérification de l'e-mail." }, { status: 500 });
  }
}