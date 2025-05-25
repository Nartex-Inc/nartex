// src/app/api/signup/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto"; // Node.js built-in
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, password_confirm, given_name, family_name /*, phone_number, gender */ } = body;

    if (!email || !password || !given_name || !family_name) {
      return NextResponse.json({ success: false, error: "Champs requis manquants." }, { status: 400 });
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

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: given_name,
        lastName: family_name,
        name: `${given_name} ${family_name}`.trim(),
        verificationToken,
        // phone_number and gender can be added if they are in your Prisma schema
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