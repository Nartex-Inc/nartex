// src/app/api/signup/route.ts (UPDATED AND CORRECTED)

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // --- CHANGED ---: We only need email and password now.
    const { email, password, password_confirm } = body;

    // --- CHANGED ---: Validation now only checks for email and password.
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "L'e-mail et le mot de passe sont requis." }, { status: 400 });
    }
    if (password !== password_confirm) {
      return NextResponse.json({ success: false, error: "Les mots de passe ne correspondent pas." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "Le mot de passe doit comporter au moins 8 caractères." }, { status: 400 });
    }

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

  } catch (error: any) {
    console.error("SIGNUP API ERROR:", error);
    return NextResponse.json({ success: false, error: "Impossible de créer le compte: " + error.message }, { status: 500 });
  }
}
