import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { compararUnidades } from "@/lib/units/orden";
import { EditorGrupos } from "./editor";

export default async function GruposPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");

  const db = createAdminClient();
  const [{ data: grupos }, { data: unidades }] = await Promise.all([
    db
      .from("charge_groups")
      .select("id, name, description, charge_group_members(unit_id, weight)")
      .eq("organization_id", profile.organization_id)
      .eq("active", true)
      .order("name"),
    db.from("units").select("id, unit_number, block").eq("organization_id", profile.organization_id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <span className="font-meta-loose text-cyan-ink">ADMINISTRACIÓN</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
          Grupos de prorrateo
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-mute">
          Gastos que pagan solo algunas unidades, como la marina o un estacionamiento techado (arts. 11 y 12 de
          la Ley de Propiedad Horizontal). Al generar cuotas, elige «Por grupo» y el total se reparte solo entre
          sus miembros, según su peso.
        </p>
      </div>
      <EditorGrupos
        grupos={(grupos ?? []).map((g) => ({
          id: g.id as string,
          name: g.name as string,
          description: (g.description as string) ?? null,
          weights: Object.fromEntries(
            ((g.charge_group_members ?? []) as { unit_id: string; weight: number }[]).map((m) => [m.unit_id, Number(m.weight)]),
          ),
        }))}
        unidades={[...(unidades ?? [])]
          .sort((a, b) =>
            compararUnidades(
              { unit_number: a.unit_number as string, block: a.block as string | null },
              { unit_number: b.unit_number as string, block: b.block as string | null },
            ),
          )
          .map((u) => ({
            id: u.id as string,
            etiqueta: `${u.unit_number as string}${u.block ? ` · ${u.block as string}` : ""}`,
            torre: (u.block as string) ?? null,
          }))}
      />
    </div>
  );
}
