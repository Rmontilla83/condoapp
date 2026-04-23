import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BCV_API = "https://ve.dolarapi.com/v1/dolares";
const CRON_SECRET = process.env.CRON_SECRET;

// GET /api/bcv-rate
//
// Devuelve la tasa BCV más actualizada y la sincroniza en la tabla
// exchange_rates de todas las orgs. Usa admin client para el upsert
// (bypass RLS, ya validamos que el caller está autenticado).
//
// Acepta auth por cookie (usuario logueado) o header Bearer CRON_SECRET
// para llamadas automáticas.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const isCron = !!(CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`);

  if (!isCron) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const res = await fetch(BCV_API, { next: { revalidate: 900 } }); // 15min cache
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch BCV rate" },
        { status: 502 },
      );
    }

    const data = await res.json();
    const oficial = data.find((d: { fuente: string }) => d.fuente === "oficial");

    if (!oficial?.promedio) {
      return NextResponse.json({ error: "BCV rate not found" }, { status: 502 });
    }

    const rate = Number(oficial.promedio);

    if (rate < 1 || rate > 100000) {
      return NextResponse.json({ error: "Rate out of range" }, { status: 502 });
    }

    const date = oficial.fechaActualizacion
      ? new Date(oficial.fechaActualizacion).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    // Admin client para upsert — bypassa RLS.
    const admin = createAdminClient();
    const { data: orgs } = await admin.from("organizations").select("id");

    let updated = 0;
    if (orgs) {
      for (const org of orgs) {
        const { error } = await admin.from("exchange_rates").upsert(
          {
            organization_id: org.id,
            rate,
            source: "bcv",
            effective_date: date,
          },
          { onConflict: "organization_id,effective_date,source" },
        );
        if (!error) updated++;
      }
    }

    return NextResponse.json({
      rate,
      date,
      source: "bcv",
      updated_orgs: updated,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al consultar tasa BCV: ${message}` },
      { status: 500 },
    );
  }
}
