// src/lib/email.ts
import nodemailer from 'nodemailer';

// DEBUGGING (Consider reducing verbosity or securing before final production)
console.log("--- Email Service Initializing (from email.ts) ---");
console.log("ENV EMAIL_SERVER_HOST:", process.env.EMAIL_SERVER_HOST);
console.log("ENV EMAIL_SERVER_PORT:", process.env.EMAIL_SERVER_PORT);
console.log("ENV EMAIL_SERVER_USER:", process.env.EMAIL_SERVER_USER);
console.log("ENV EMAIL_FROM:", process.env.EMAIL_FROM);
// For security, just check if the password is set
console.log("ENV EMAIL_SERVER_PASSWORD is set:", !!process.env.EMAIL_SERVER_PASSWORD);
console.log("ENV NEXTAUTH_URL for email links:", process.env.NEXTAUTH_URL);
console.log("---------------------------------------------");

const emailHost = process.env.EMAIL_SERVER_HOST;
const emailPort = Number(process.env.EMAIL_SERVER_PORT);
const emailUser = process.env.EMAIL_SERVER_USER;
const emailPassword = process.env.EMAIL_SERVER_PASSWORD;

let isEmailServiceConfigured = true;

if (!emailHost || !emailPort || !emailUser || !emailPassword) {
    console.error("FATAL ERROR: Email server configuration is incomplete. One or more required environment variables (EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD) are missing. Email sending will be disabled.");
    isEmailServiceConfigured = false;
}
if (!process.env.NEXTAUTH_URL) {
    console.error("FATAL ERROR: NEXTAUTH_URL environment variable is not set. Cannot generate verification links. Email sending will be disabled.");
    isEmailServiceConfigured = false; // Also disable if NEXTAUTH_URL is missing for links
}


let transporter: nodemailer.Transporter | null = null;

if (isEmailServiceConfigured) {
    transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465, // true for port 465 (SSL), false for 587 (STARTTLS)
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      requireTLS: emailPort === 587 ? true : false, // Enforce STARTTLS for port 587
      // logger: true, // Uncomment for verbose nodemailer logs during debugging
      // debug: true,  // Uncomment for even more verbose nodemailer logs
    });
    console.log("Nodemailer transporter configured.");
} else {
    console.warn("Email transporter not created due to missing configuration.");
}

// Function to generate the year for the footer
const getCurrentYear = () => new Date().getFullYear();

export async function sendVerificationEmail(email: string, token: string) {
  if (!isEmailServiceConfigured || !transporter) {
    console.error("Email transporter not properly configured or not initialized. Cannot send verification email.");
    // It's important that this error is propagated so the signup process can handle it
    throw new Error("Email service is not configured or unavailable. Please contact support.");
  }

  const verificationLink = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
  // USE YOUR PROVIDED WHITE LOGO URL
  const nartexLogoUrl = "https://nartex-static-assets.s3.ca-central-1.amazonaws.com/nartex-logo-white.png";

  // Define CSS separately for clarity and potentially to help with parsing
  const cssStyles = `
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f4f7; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    .container { width: 100%; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background-color: #0D1117; padding: 30px 20px; text-align: center; }
    .logo { max-width: 140px; height: auto; display: block; margin: 0 auto; }
    .content { padding: 35px 40px; color: #374151; line-height: 1.65; font-size: 16px; text-align: left; }
    .content h1 { color: #1a202c; font-size: 24px; margin-top: 0; margin-bottom: 20px; text-align: center; font-weight: 600; }
    .content p { margin-top:0; margin-bottom: 18px; font-size: 15px; }
    .button-container { text-align: center; margin: 30px 0; }
    .button-link {
        background-color: #1D8102;
        color: #ffffff !important;
        padding: 14px 32px;
        text-decoration: none !important;
        border-radius: 6px;
        font-weight: bold;
        font-size: 17px;
        display: inline-block;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s ease-in-out;
    }
    .button-link:hover { background-color: #176802; }
    .footer { background-color: #f8f9fa; padding: 25px 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e2e8f0; }
    .footer a { color: #1D8102; text-decoration: none; }
    .link-wrapper { word-break: break-all; font-size: 13px; text-align: left; }
    .link-wrapper a { color: #1D8102; text-decoration: underline; }
    .note { font-size: 13px; color: #555555; text-align: center; margin-top: 25px; margin-bottom: 5px; }

    @media screen and (max-width: 600px) {
        .content { padding: 25px 20px !important; }
        .header { padding: 25px !important; }
        .content h1 { font-size: 22px !important; }
        .button-link { font-size: 16px !important; padding: 12px 28px !important; } /* Corrected from .button to .button-link */
        .container { width: 90% !important; margin: 20px auto !important; }
    }
  `;

  // Construct the HTML for the email
  const htmlBody = `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vérifiez votre adresse e-mail - Nartex</title>
      <style type="text/css">
        ${cssStyles}
      </style>
      <!--[if mso]>
      <style type="text/css">
      .button-outlook {
          display:inline-block!important;
          padding:14px 32px!important;
          background-color:#1D8102!important;
          color:#ffffff!important;
          font-family:Arial,sans-serif!important;
          font-size:17px!important;
          font-weight:bold!important;
          text-decoration:none!important;
          border-radius:6px!important;
          text-align:center!important;
      }
      </style>
      <![endif]-->
  </head>
  <body>
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f7;">
          <tr>
              <td align="center" style="padding: 20px 10px;">
                  <!--[if (gte mso 9)|(IE)]>
                  <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                  <tr>
                  <td align="center" valign="top" width="600">
                  <![endif]-->
                  <table class="container" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
                      <tr>
                          <td class="header" style="background-color: #0D1117; padding: 30px 20px; text-align: center;">
                              <img src="${nartexLogoUrl}" alt="Nartex Logo" class="logo" style="max-width: 140px; height: auto; display:block; margin:0 auto;">
                          </td>
                      </tr>
                      <tr>
                          <td class="content" style="padding: 35px 40px; color: #374151; line-height: 1.65; font-size: 16px; text-align:left;">
                              <h1 style="color: #1a202c; font-size: 24px; margin-top: 0; margin-bottom: 20px; text-align: center; font-weight: 600;">Vérifiez votre compte Nartex</h1>
                              <p style="margin-top:0; margin-bottom: 18px; font-size: 15px;">Bonjour,</p>
                              <p style="margin-top:0; margin-bottom: 18px; font-size: 15px;">Merci de vous être inscrit sur Nartex ! Pour commencer à utiliser notre plateforme, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous :</p>
                              <table width="100%" border="0" cellspacing="0" cellpadding="0" class="button-container" style="text-align: center; margin: 30px 0;">
                                  <tr>
                                      <td align="center">
                                          <!-- Outlook VML Button -->
                                          <!--[if mso]>
                                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${verificationLink}" style="height:50px;v-text-anchor:middle;width:250px;" arcsize="10%" strokecolor="#1D8102" fillcolor="#1D8102">
                                              <w:anchorlock/>
                                              <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">
                                                  Activer mon compte
                                              </center>
                                          </v:roundrect>
                                          <![endif]-->
                                          <!-- Button for other clients -->
                                          <!--[if !mso]><!-->
                                          <a href="${verificationLink}" target="_blank" class="button-link" style="background-color: #1D8102;color: #ffffff !important;padding: 14px 32px;text-decoration: none !important;border-radius: 6px;font-weight: bold;font-size: 17px;display: inline-block;">
                                              Activer mon compte
                                          </a>
                                          <!--<![endif]-->
                                      </td>
                                  </tr>
                              </table>
                              <p class="note" style="font-size: 13px; color: #555555; text-align: center; margin-top: 25px; margin-bottom: 5px;">Ce lien de vérification est valide pendant 24 heures.</p>
                              <p style="margin-top:0; margin-bottom: 18px; font-size: 15px;">Si le bouton ne fonctionne pas, copiez et collez le lien suivant dans la barre d'adresse de votre navigateur :</p>
                              <p class="link-wrapper" style="word-break: break-all; font-size: 13px; text-align:left;"><a href="${verificationLink}" target="_blank" style="color: #1D8102; text-decoration: underline;">${verificationLink}</a></p>
                              <p style="margin-top:0; margin-bottom: 18px; font-size: 15px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.</p>
                              <p style="margin-top:0; margin-bottom: 0; font-size: 15px;">Cordialement,<br>L'équipe Nartex</p>
                          </td>
                      </tr>
                      <tr>
                          <td class="footer" style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e2e8f0;">
                              © ${getCurrentYear()} Nartex. Tous droits réservés.<br>
                              <a href="${process.env.NEXTAUTH_URL}/privacy" style="color: #1D8102; text-decoration: none;">Politique de confidentialité</a> | <a href="${process.env.NEXTAUTH_URL}/terms" style="color: #1D8102; text-decoration: none;">Conditions d'utilisation</a>
                          </td>
                      </tr>
                  </table>
                  <!--[if (gte mso 9)|(IE)]>
                  </td>
                  </tr>
                  </table>
                  <![endif]-->
              </td>
          </tr>
      </table>
  </body>
  </html>
  `;

  console.log(`Attempting to send verification email to: ${email} using configured transporter.`);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM, // e.g., "Nartex <noreply@nartex.ca>"
      to: email,
      subject: 'Vérifiez votre adresse e-mail - Nartex',
      html: htmlBody,
    });
    console.log(`Verification email sent successfully to ${email}`);
  } catch (error) {
    console.error(`Failed to send verification email to ${email}:`, error);
    throw error; // Re-throw to let the caller handle it (e.g., /api/signup)
  }
}

// =============================================================================
// SUPPORT TICKET NOTIFICATION
// =============================================================================

interface TicketNotificationData {
  ticketCode: string;
  sujet: string;
  description: string;
  userName: string;
  userEmail: string;
  tenantName: string;
  site: string;
  departement: string;
  categorie: string;
  priorite: string;
  prioriteLabel: string;
  slaHours: number;
}

export async function sendTicketNotificationEmail(data: TicketNotificationData) {
  if (!isEmailServiceConfigured || !transporter) {
    console.error("Email transporter not configured. Cannot send ticket notification.");
    return;
  }

  const itSupportEmail = process.env.IT_SUPPORT_EMAIL || "ti@sinto.ca";
  const ticketUrl = `${process.env.NEXTAUTH_URL}/dashboard/support/tickets`;
  const nartexLogoUrl = "https://nartex-static-assets.s3.ca-central-1.amazonaws.com/nartex-logo-white.png";

  // Priority colors and backgrounds
  const priorityStyles: Record<string, { bg: string; text: string; light: string }> = {
    P1: { bg: "#dc2626", text: "#ffffff", light: "#fef2f2" },
    P2: { bg: "#ea580c", text: "#ffffff", light: "#fff7ed" },
    P3: { bg: "#ca8a04", text: "#ffffff", light: "#fefce8" },
    P4: { bg: "#16a34a", text: "#ffffff", light: "#f0fdf4" },
  };
  const pStyle = priorityStyles[data.priorite] || { bg: "#6b7280", text: "#ffffff", light: "#f9fafb" };

  const htmlBody = `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nouvelle demande - ${data.ticketCode}</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
          <tr>
              <td align="center" style="padding: 40px 20px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px;">

                      <!-- Logo Section -->
                      <tr>
                          <td align="center" style="padding-bottom: 32px;">
                              <img src="${nartexLogoUrl}" alt="Nartex" width="100" style="display: block; max-width: 100px; height: auto;">
                          </td>
                      </tr>

                      <!-- Main Card -->
                      <tr>
                          <td style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); overflow: hidden;">

                              <!-- Priority Badge Header -->
                              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                      <td style="padding: 24px 32px; background-color: ${pStyle.light}; border-bottom: 1px solid #e5e7eb;">
                                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                              <tr>
                                                  <td>
                                                      <span style="display: inline-block; padding: 6px 12px; background-color: ${pStyle.bg}; color: ${pStyle.text}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 6px;">
                                                          ${data.priorite} &bull; ${data.prioriteLabel}
                                                      </span>
                                                      <span style="display: inline-block; margin-left: 12px; color: #6b7280; font-size: 13px;">
                                                          SLA: ${data.slaHours} heures
                                                      </span>
                                                  </td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                              </table>

                              <!-- Content -->
                              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                  <tr>
                                      <td style="padding: 32px;">

                                          <!-- Ticket Code -->
                                          <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                                              Nouvelle demande
                                          </p>
                                          <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 700; color: #111827; font-family: 'SF Mono', Monaco, 'Courier New', monospace; letter-spacing: -0.5px;">
                                              ${data.ticketCode}
                                          </h1>

                                          <!-- Subject -->
                                          <h2 style="margin: 0 0 24px 0; font-size: 18px; font-weight: 600; color: #374151; line-height: 1.4;">
                                              ${data.sujet}
                                          </h2>

                                          <!-- Info Cards -->
                                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                                              <tr>
                                                  <td style="padding: 16px; background-color: #f9fafb; border-radius: 8px;">
                                                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                          <tr>
                                                              <td style="padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                                                                  <p style="margin: 0 0 4px 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Demandeur</p>
                                                                  <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 500;">${data.userName}</p>
                                                                  <p style="margin: 2px 0 0 0; font-size: 13px; color: #6b7280;">${data.userEmail}</p>
                                                              </td>
                                                          </tr>
                                                          <tr>
                                                              <td style="padding-top: 12px;">
                                                                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                                      <tr>
                                                                          <td width="50%" valign="top">
                                                                              <p style="margin: 0 0 4px 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Organisation</p>
                                                                              <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 500;">${data.tenantName}</p>
                                                                          </td>
                                                                          <td width="50%" valign="top">
                                                                              <p style="margin: 0 0 4px 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Catégorie</p>
                                                                              <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 500;">${data.categorie}</p>
                                                                          </td>
                                                                      </tr>
                                                                  </table>
                                                              </td>
                                                          </tr>
                                                          <tr>
                                                              <td style="padding-top: 12px;">
                                                                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                                      <tr>
                                                                          <td width="50%" valign="top">
                                                                              <p style="margin: 0 0 4px 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Site</p>
                                                                              <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 500;">${data.site}</p>
                                                                          </td>
                                                                          <td width="50%" valign="top">
                                                                              <p style="margin: 0 0 4px 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Département</p>
                                                                              <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 500;">${data.departement}</p>
                                                                          </td>
                                                                      </tr>
                                                                  </table>
                                                              </td>
                                                          </tr>
                                                      </table>
                                                  </td>
                                              </tr>
                                          </table>

                                          <!-- Description -->
                                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                                              <tr>
                                                  <td style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border-left: 3px solid ${pStyle.bg};">
                                                      <p style="margin: 0 0 8px 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">Description</p>
                                                      <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${data.description.substring(0, 600)}${data.description.length > 600 ? '...' : ''}</p>
                                                  </td>
                                              </tr>
                                          </table>

                                          <!-- CTA Button -->
                                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                              <tr>
                                                  <td align="center">
                                                      <a href="${ticketUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                                          Voir dans Nartex &rarr;
                                                      </a>
                                                  </td>
                                              </tr>
                                          </table>

                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                          <td align="center" style="padding: 32px 20px;">
                              <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
                                  Ce message a été envoyé automatiquement par Nartex.
                              </p>
                              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                  &copy; ${getCurrentYear()} Nartex Inc. &bull; Tous droits réservés.
                              </p>
                          </td>
                      </tr>

                  </table>
              </td>
          </tr>
      </table>
  </body>
  </html>
  `;

  console.log(`Sending ticket notification for ${data.ticketCode} to ${itSupportEmail}`);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: itSupportEmail,
      subject: `[${data.priorite}] ${data.ticketCode} - ${data.sujet}`,
      html: htmlBody,
    });
    console.log(`Ticket notification sent successfully for ${data.ticketCode}`);
  } catch (error) {
    console.error(`Failed to send ticket notification for ${data.ticketCode}:`, error);
  }
}

export async function sendPriceListEmail(to: string, pdfBuffer: Buffer, subject: string) {
  if (!isEmailServiceConfigured || !transporter) {
    console.error("Email service not configured.");
    throw new Error("Service courriel non disponible.");
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: to,
      subject: subject,
      text: "Veuillez trouver ci-joint la liste de prix générée.",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Liste de Prix Nartex</h2>
          <p>Bonjour,</p>
          <p>Veuillez trouver ci-joint la liste de prix que vous avez générée.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Ce message a été envoyé automatiquement par Nartex.</p>
        </div>
      `,
      attachments: [
        {
          filename: "Liste_Prix_SINTO.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
    console.log(`Price list email sent to ${to}`);
  } catch (error) {
    console.error("Failed to send price list email:", error);
    throw error;
  }
}
