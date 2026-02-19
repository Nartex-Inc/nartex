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

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: "Un compte avec cet e-mail existe déjà." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = randomUUID();

    // --- CHANGED ---: The prisma.user.create call is now much simpler.
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        // We set the `name` field to the email as a sensible default.
        // It can be changed by the user later in a profile page.
        name: email, 
        verificationToken,
        // `firstName` and `lastName` are omitted, and Prisma will
        // leave them as null since they are optional in the schema.
      },
    });

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
