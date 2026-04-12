import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BCV_API = "https://ve.dolarapi.com/v1/dolares";

export async function GET() {
  try {
    // Fetch current BCV rate
    const res = await fetch(BCV_API, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch BCV rate" }, { status: 502 });
    }

    const data = await res.json();
    const oficial = data.find(
      (d: { fuente: string }) => d.fuente === "oficial"
    );

    if (!oficial?.promedio) {
      return NextResponse.json({ error: "BCV rate not found in response" }, { status: 502 });
    }

    const rate = Number(oficial.promedio);
    const date = oficial.fechaActualizacion
      ? new Date(oficial.fechaActualizacion).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    // Update all organizations with the new rate
    const supabase = await createClient();
    const { data: orgs } = await supabase.from("organizations").select("id");

    if (orgs) {
      for (const org of orgs) {
        await supabase.from("exchange_rates").upsert(
          {
            organization_id: org.id,
            rate,
            source: "bcv",
            effective_date: date,
          },
          { onConflict: "organization_id,effective_date,source" }
        );
      }
    }

    return NextResponse.json({
      rate,
      date,
      source: "bcv",
      updated_orgs: orgs?.length ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
