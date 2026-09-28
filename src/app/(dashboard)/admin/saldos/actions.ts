"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/queries";
import { requireAdmin } from "@/lib/permissions";
import { aplicarSaldos, saldosPorUnidad } from "@/lib/saldos";

type Resultado = { error: string } | { success: true; aplicadas: number };

/**
 * Registra un saldo a favor (o lo corrige a la baja) y lo aplica en el acto a
 * las cuotas pendientes de la unidad.
 */
export async function registrarSaldo(formData: FormData): Promise<Resultado> {
  const profile = await getCurrentProfile();
  const guard = requireAdmin(profile);
  if (guard) return guard;
  const orgId = profile!.organization_id!;

  const unitId = String(formData.get("unit_id") ?? "");
  const tipo = formData.get("tipo") === "correccion" ? "correccion" : "deposito";
  const monto = Math.round(Number(String(formData.get("monto") ?? "").replace(",", ".")) * 100) / 100;
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 300);

  if (!unitId) return { error: "Elige la unidad" };
  if (!Number.isFinite(monto) || monto <= 0) return { error: "El monto debe ser mayor que cero" };
  if (monto > 100_000) return { error: "El monto parece demasiado alto; revísalo" };
  if (nota.length < 4) return { error: "Escribe el motivo: el residente y la junta lo van a ver" };

  const admin = createAdminClient();
  const { data: unidad } = await admin
    .from("units")
    .select("id")
    .eq("id", unitId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!unidad) return { error: "Esa unidad no es de este condominio" };

  const { data: org } = await admin.from("organizations").select("currency").eq("id", orgId).single();

  if (tipo === "correccion") {
    // Solo se puede restar lo que todavía no se aplicó a cuotas.
    const disponible = (await saldosPorUnidad(admin, [unitId])).get(unitId) ?? 0;
    if (monto > disponible) {
      return {
        error: `La unidad tiene $${disponible.toFixed(2)} disponibles. Lo ya aplicado a cuotas se corrige anulando esas cuotas.`,
      };
    }
  }

  const { error } = await admin.from("unit_credits").insert({
    organization_id: orgId,
    unit_id: unitId,
    amount: tipo === "correccion" ? -monto : monto,
    currency: (org?.currency as string) || "USD",
    kind: tipo === "correccion" ? "adjustment" : "deposit",
    note: nota,
    created_by: profile!.id,
  });
  if (error) return { error: error.message };

  const aplicadas = tipo === "deposito" ? await aplicarSaldos(admin, [unitId], profile!.id) : 0;

  revalidatePath("/admin/saldos");
  revalidatePath("/pagos");
  revalidatePath("/admin");
  return { success: true, aplicadas };
}
