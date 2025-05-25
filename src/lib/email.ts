// src/lib/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  secure: Number(process.env.EMAIL_SERVER_PORT) === 465, // true for 465, false for other ports
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationLink = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Vérifiez votre adresse e-mail - Nartex',
    html: `<p>Merci de vous être inscrit ! Cliquez ici pour vérifier votre e-mail : <a href="${verificationLink}">${verificationLink}</a></p>`,
  });
}

// Add sendPasswordResetEmail later if implementing password reset