import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendPriceListEmail } from "@/lib/email"; // <--- Import from your existing file

export async function POST(request: NextRequest) {
  try {
    // 1. Security Check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Parse Data
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const to = formData.get("to") as string | null;
    const subject = formData.get("subject") as string || "Liste de Prix SINTO";

    if (!file || !to) {
      return NextResponse.json({ error: "Fichier ou destinataire manquant" }, { status: 400 });
    }

    // 3. Prepare File
    const buffer = Buffer.from(await file.arrayBuffer());

    // 4. Send using your shared utility
    await sendPriceListEmail(to, buffer, subject);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("API Email error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'envoi" },
      { status: 500 }
    );
  }
}
