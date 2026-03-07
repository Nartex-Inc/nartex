// src/app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ResetPasswordSchema } from "@/lib/validations";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success, retryAfterMs } = rateLimit({
    key: `reset-password:${ip}`,
    limit: 5,
    windowMs: 15 * 60_000,
  });

  if (!success) {
    return rateLimitResponse(retryAfterMs);
  }

  try {
    const raw = await req.json();
    const parsed = ResetPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Données invalides";
      return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const { token, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
      select: { id: true, passwordResetExpires: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Jeton invalide ou expiré." },
        { status: 400 }
      );
    }

    // Check token expiration
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      // Clear the expired token
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: null, passwordResetExpires: null },
      });
      return NextResponse.json(
        { success: false, error: "Ce lien de réinitialisation a expiré. Veuillez en demander un nouveau." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        // Also verify email if not already verified (user proved email ownership)
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mot de passe réinitialisé avec succès.",
    });
  } catch (error) {
    console.error("RESET PASSWORD API ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la réinitialisation. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
