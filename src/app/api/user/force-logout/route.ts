import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isGestionnaire } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  if (!isGestionnaire(auth.user)) {
    return NextResponse.json(
      { error: "Vous ne disposez pas des autorisations nécessaires." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { userId } = body;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json(
      { error: "userId requis" },
      { status: 400 }
    );
  }

  // Prevent self-logout
  if (userId === auth.user.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas réinitialiser votre propre session." },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { forceLogoutAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
