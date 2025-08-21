// src/app/api/salesreps/route.ts
import { NextResponse } from "next/server";
import { pg } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const qCamel = `SELECT "Name" AS name FROM public."Salesrep" ORDER BY "Name";`;
  const qLower = `SELECT name AS name FROM salesrep ORDER BY name;`;

  try {
    const { rows } = await pg.query(qCamel);
    return NextResponse.json(rows);
  } catch {
    const { rows } = await pg.query(qLower);
    return NextResponse.json(rows);
  }
}
