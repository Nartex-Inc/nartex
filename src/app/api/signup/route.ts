// src/app/api/signup/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import { SignupSchema } from "@/lib/validations";
import { getErrorMessage } from "@/lib/auth-helpers";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success, retryAfterMs } = rateLimit({
    key: `signup:${ip}`,
    limit: 5,
    windowMs: 15 * 60_000,
  });

  if (!success) {
    return rateLimitResponse(retryAfterMs);
  }

  try {
    const raw = await req.json();
    const parsed = SignupSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Données invalides";
      return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const invitationToken = (raw as any).invitationToken as string | undefined;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: "Un compte avec cet e-mail existe déjà." }, { status: 409 });
    }

    // Check for valid invitation
    let invitation: { id: string; role: any; tenantId: string } | null = null;
    if (invitationToken) {
      const found = await prisma.invitation.findUnique({
        where: { token: invitationToken },
        select: { id: true, role: true, tenantId: true, status: true, expiresAt: true, email: true },
      });
      if (found && found.status === "pending" && found.expiresAt > new Date()) {
        // Verify the email matches the invitation (case-insensitive)
        if (found.email.toLowerCase() === email.toLowerCase()) {
          invitation = { id: found.id, role: found.role, tenantId: found.tenantId };
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = randomUUID();

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: email,
        verificationToken,
        ...(invitation ? { role: invitation.role } : {}),
      },
    });

    // If invitation is valid, create tenant link and mark accepted
    if (invitation) {
      await prisma.$transaction([
        prisma.userTenant.create({
          data: { userId: user.id, tenantId: invitation.tenantId },
        }),
        prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "accepted" },
        }),
      ]);
    }

    await sendVerificationEmail(email, verificationToken);

    return NextResponse.json({
      success: true,
      message: "Compte créé. Veuillez vérifier votre e-mail pour l'activer.",
    });

  } catch (error: unknown) {
    console.error("SIGNUP API ERROR:", error);
    return NextResponse.json({ success: false, error: "Impossible de créer le compte: " + getErrorMessage(error) }, { status: 500 });
  }
}
