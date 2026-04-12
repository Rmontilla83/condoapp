import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BCV_API = "https://ve.dolarapi.com/v1/dolares";
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Auth: either cron secret header or authenticated user
  const authHeader = request.headers.get("authorization");
  const isCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

  if (!isCron) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const res = await fetch(BCV_API, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch BCV rate" }, { status: 502 });
    }

    const data = await res.json();
    const oficial = data.find((d: { fuente: string }) => d.fuente === "oficial");

    if (!oficial?.promedio) {
      return NextResponse.json({ error: "BCV rate not found" }, { status: 502 });
    }

    const rate = Number(oficial.promedio);

    // Validate rate is reasonable (between 1 and 100000 Bs/$)
    if (rate < 1 || rate > 100000) {
      return NextResponse.json({ error: "Rate out of range" }, { status: 502 });
    }

    const date = oficial.fechaActualizacion
      ? new Date(oficial.fechaActualizacion).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const supabase = await createClient();
    const { data: orgs } = await supabase.from("organizations").select("id");

    if (orgs) {
      for (const org of orgs) {
        await supabase.from("exchange_rates").upsert(
          { organization_id: org.id, rate, source: "bcv", effective_date: date },
          { onConflict: "organization_id,effective_date,source" }
        );
      }
    }

    return NextResponse.json({ rate, date, source: "bcv", updated_orgs: orgs?.length ?? 0 });
  } catch {
    return NextResponse.json({ error: "Error al consultar tasa BCV" }, { status: 500 });
  }
}
