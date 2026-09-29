import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/conserje/lugares
//
// Dónde puede estar la avería que el conserje propone reportar: las unidades
// de quien pregunta (en su condominio efectivo) y las áreas comunes activas.
// La acción que crea el reporte vuelve a validar las dos cosas.
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const db = createAdminClient();
  const [{ data: miembros }, { data: areas }] = await Promise.all([
    db
      .from("unit_members")
      .select("units!inner(id, unit_number, block, organization_id)")
      .eq("profile_id", profile.id)
      .eq("active", true)
      .eq("units.organization_id", profile.organization_id),
    db
      .from("common_areas")
      .select("id, name")
      .eq("organization_id", profile.organization_id)
      .eq("is_active", true)
      .order("name"),
  ]);

  type Fila = { units: { id: string; unit_number: string; block: string | null } };
  const unidades = ((miembros ?? []) as unknown as Fila[]).map((m) => ({
    id: m.units.id,
    etiqueta: `Apto ${m.units.unit_number}${m.units.block ? ` · ${m.units.block}` : ""}`,
  }));
  return NextResponse.json({ unidades, areas: areas ?? [] });
}
