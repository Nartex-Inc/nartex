// src/app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
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
    // Optional: Add token expiry check here if you implement `verificationTokenExpires`

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null, // Clear token after use
      },
    });

    return NextResponse.json({ success: true, message: "E-mail vérifié avec succès !" });

  } catch (error: any) {
    console.error("EMAIL VERIFICATION API ERROR:", error);
    return NextResponse.json({ success: false, error: "Erreur lors de la vérification de l'e-mail." }, { status: 500 });
  }
}