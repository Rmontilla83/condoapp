import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile, getEffectiveRole } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { AliquotEditor, type UnitForAliquot } from "./aliquot-editor";
import type { Organization } from "@/types/database";

/**
 * Hoja de alícuotas.
 *
 * Ruta hija de /admin/units en vez de pestaña: esa pantalla es un grid de
 * tarjetas orientado a ocupación y accesos, y cargar alícuotas necesita justo lo
 * contrario — todas las unidades a la vez y la suma corriendo a la vista.
 */
export default async function AlicuotasPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const effectiveRole = getEffectiveRole(profile);
  if (effectiveRole !== "admin" && effectiveRole !== "super_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [unitsRes, orgRes, cuotasRes] = await Promise.all([
    supabase
      .from("units")
      .select("id, unit_number, floor, block, type, aliquot")
      .eq("organization_id", profile.organization_id)
      .order("block", { ascending: true })
      .order("unit_number", { ascending: true }),
    supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single<Organization>(),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .in("status", ["pending", "overdue"]),
  ]);

  const org = orgRes.data;
  const units: UnitForAliquot[] = (unitsRes.data ?? []).map((u) => ({
    id: u.id as string,
    unit_number: u.unit_number as string,
    block: (u.block as string | null) ?? null,
    floor: (u.floor as number | null) ?? null,
    type: (u.type as string) ?? "apartment",
    aliquot: u.aliquot === null || u.aliquot === undefined ? null : Number(u.aliquot),
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/units"
          className="font-meta text-cyan-ink hover:text-marine-deep transition-colors"
        >
          ← UNIDADES
        </Link>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
          Alícuotas del <em className="font-editorial text-cyan">condominio</em>
        </h1>
        <p className="mt-3 text-[15px] text-mute max-w-2xl">
          La alícuota es la fracción de propiedad de cada unidad. Sale del documento de
          condominio: acá se transcribe. Define cuánto paga cada vecino cuando el condominio
          cobra por alícuota, y cuánto pesa su voto en una asamblea ponderada.
        </p>
      </div>

      {units.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border py-12 text-center">
          <p className="text-[14px] text-mute">
            Todavía no hay unidades. Agrégalas desde el panel de administración y vuelve.
          </p>
        </div>
      ) : (
        <AliquotEditor
          units={units}
          feeMode={(org?.fee_mode as string) ?? "flat"}
          feeBaseAmount={
            org?.fee_base_amount === null || org?.fee_base_amount === undefined
              ? null
              : Number(org.fee_base_amount)
          }
          currency={(org?.currency as string) ?? "USD"}
          cuotasPendientes={cuotasRes.count ?? 0}
        />
      )}
    </div>
  );
}
