import { NextResponse, type NextRequest } from "next/server";
import { recordatoriosAutomaticos } from "@/lib/recordatorios";

// GET /api/cron/recordatorios — Vercel Cron, una vez al día (vercel.json).
// Solo con el secreto del cron: sin él, cualquiera podría disparar correos.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const r = await recordatoriosAutomaticos();
  return NextResponse.json(r);
}
