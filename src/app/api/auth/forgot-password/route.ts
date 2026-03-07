// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { ForgotPasswordSchema } from "@/lib/validations";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success, retryAfterMs } = rateLimit({
    key: `forgot-password:${ip}`,
    limit: 3,
    windowMs: 15 * 60_000,
  });

  if (!success) {
    return rateLimitResponse(retryAfterMs);
  }

  try {
    const raw = await req.json();
    const parsed = ForgotPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      // Always return generic success to prevent email enumeration (ISO-27001)
      return NextResponse.json({
        success: true,
        message: "Si un compte est associé à cet e-mail, un lien de réinitialisation a été envoyé.",
      });
    }

    const { email } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, password: true },
    });

    // Only send reset email if:
    // 1. User exists
    // 2. User has a password (not OAuth-only account)
    if (user?.email && user.password) {
      const token = randomUUID();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: expires,
        },
      });

      try {
        await sendPasswordResetEmail(user.email, token);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        // Don't expose email sending failures to prevent enumeration
      }
    }

    // Always return same response to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "Si un compte est associé à cet e-mail, un lien de réinitialisation a été envoyé.",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD API ERROR:", error);
    return NextResponse.json({
      success: true,
      message: "Si un compte est associé à cet e-mail, un lien de réinitialisation a été envoyé.",
    });
  }
}
