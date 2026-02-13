// src/app/api/support/email-webhook/route.ts
// Webhook endpoint to receive email replies and add them as ticket comments
//
// This endpoint expects POST requests from email services like:
// - SendGrid Inbound Parse
// - Mailgun Routes
// - AWS SES + Lambda
// - Google Workspace (via Apps Script webhook)
//
// Configure your email service to forward replies to support@nartex.ca
// or use a catch-all and forward to this webhook.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// =============================================================================
// POST - Receive email reply webhook
// =============================================================================

interface EmailWebhookPayload {
  // Common fields across email services
  from?: string;
  sender?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
  // SendGrid specific
  envelope?: string;
  // Custom headers we set
  headers?: Record<string, string>;
  // Reference ticket code from subject or headers
  ticketCode?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (required)
    const webhookSecret = request.headers.get("x-webhook-secret");
    const expectedSecret = process.env.EMAIL_WEBHOOK_SECRET;

    if (!expectedSecret || webhookSecret !== expectedSecret) {
      console.warn("Invalid or missing webhook secret");
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body (could be JSON or form-data depending on email service)
    let body: EmailWebhookPayload;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      body = {
        from: formData.get("from")?.toString() || formData.get("sender")?.toString(),
        to: formData.get("to")?.toString(),
        subject: formData.get("subject")?.toString(),
        text: formData.get("text")?.toString() || formData.get("plain")?.toString(),
        html: formData.get("html")?.toString(),
        envelope: formData.get("envelope")?.toString(),
      };
    } else {
      body = await request.json();
    }

    console.log("Email webhook received:", {
      from: body.from,
      to: body.to,
      subject: body.subject,
      textLength: body.text?.length,
    });

    // Extract ticket code from subject line
    // Format: [TI-XXXXXXXX-XXXX] or Re: [TI-XXXXXXXX-XXXX]
    const ticketCodeMatch = body.subject?.match(/\[?(TI-\d{8}-\d{4})\]?/i);
    const ticketCode = body.ticketCode || ticketCodeMatch?.[1];

    if (!ticketCode) {
      console.warn("No ticket code found in email subject:", body.subject);
      return NextResponse.json({
        ok: false,
        error: "No ticket code found in subject line",
      }, { status: 400 });
    }

    // Find the ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { code: ticketCode.toUpperCase() },
      select: {
        id: true,
        code: true,
        userEmail: true,
        userId: true,
        statut: true,
      },
    });

    if (!ticket) {
      console.warn("Ticket not found:", ticketCode);
      return NextResponse.json({
        ok: false,
        error: "Ticket not found",
      }, { status: 404 });
    }

    // Extract sender email
    const senderEmail = extractEmail(body.from || body.sender || "");
    if (!senderEmail) {
      console.warn("Could not extract sender email from:", body.from);
      return NextResponse.json({
        ok: false,
        error: "Invalid sender email",
      }, { status: 400 });
    }

    // Extract the reply content (remove quoted text)
    const replyContent = extractReplyContent(body.text || body.html || "");
    if (!replyContent || replyContent.trim().length < 1) {
      console.warn("Empty reply content");
      return NextResponse.json({
        ok: false,
        error: "Empty reply content",
      }, { status: 400 });
    }

    // Find or identify the user
    const user = await prisma.user.findUnique({
      where: { email: senderEmail.toLowerCase() },
      select: { id: true, name: true, email: true },
    });

    // Determine if this is an internal (IT team) or external reply
    const isFromRequester = senderEmail.toLowerCase() === ticket.userEmail.toLowerCase();
    const isInternal = !isFromRequester && !!user; // Assume internal if not from requester and user exists

    // Create the comment
    const comment = await prisma.supportTicketComment.create({
      data: {
        ticketId: ticket.id,
        userId: user?.id || ticket.userId,
        userName: user?.name || extractName(body.from || "") || senderEmail,
        content: replyContent.trim(),
        isInternal: false, // Email replies are always visible to requester
      },
    });

    // If ticket was resolved/closed and requester replies, reopen it
    if (isFromRequester && ["resolu", "ferme"].includes(ticket.statut)) {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { statut: "en_cours" },
      });
      console.log(`Ticket ${ticketCode} reopened due to requester reply`);
    }

    console.log(`Email reply added to ticket ${ticketCode} from ${senderEmail}`);

    return NextResponse.json({
      ok: true,
      data: {
        ticketCode,
        commentId: comment.id,
        from: senderEmail,
        isInternal,
      },
    });
  } catch (error) {
    console.error("Email webhook error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to process email" },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractEmail(fromField: string): string | null {
  // Handle formats like: "John Doe <john@example.com>" or "john@example.com"
  const match = fromField.match(/<([^>]+)>/) || fromField.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1].toLowerCase() : null;
}

function extractName(fromField: string): string | null {
  // Handle format: "John Doe <john@example.com>"
  const match = fromField.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : null;
}

function extractReplyContent(content: string): string {
  // Remove HTML tags if present
  let text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  // Try to find reply delimiter and get only the new content
  // Common patterns:
  // - "On DATE, NAME wrote:"
  // - "Le DATE, NAME a écrit :"
  // - "-----Original Message-----"
  // - "> quoted text"

  const delimiters = [
    /^.*On\s+\w+,\s+\w+\s+\d+,\s+\d+.*wrote:.*$/im,
    /^.*Le\s+\d+.*a écrit\s*:.*$/im,
    /^-{3,}.*Original Message.*-{3,}.*$/im,
    /^-{3,}.*Message original.*-{3,}.*$/im,
    /^From:.*$/im,
    /^De\s*:.*$/im,
  ];

  for (const delimiter of delimiters) {
    const match = text.match(delimiter);
    if (match && match.index !== undefined) {
      text = text.substring(0, match.index).trim();
      break;
    }
  }

  // Remove lines starting with > (quoted text)
  const lines = text.split("\n");
  const filteredLines = lines.filter((line) => !line.trim().startsWith(">"));
  text = filteredLines.join("\n").trim();

  // Remove signature blocks (-- followed by text)
  const sigMatch = text.match(/\n--\s*\n/);
  if (sigMatch && sigMatch.index !== undefined) {
    text = text.substring(0, sigMatch.index).trim();
  }

  return text;
}

// =============================================================================
// GET - Health check for webhook endpoint
// =============================================================================

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Email webhook endpoint is active",
    usage: "POST email data with ticket code in subject line",
  });
}
