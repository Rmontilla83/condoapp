import { redirect } from "next/navigation";
import { getCurrentProfile, getOrganization } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInTimeZone } from "@/lib/utils";
import { usd } from "@/lib/format";
import { Cifra, Cifras, Encabezado, Pestanas, PESTANAS_CUENTAS } from "@/components/contabilidad/ui";
import { Apertura } from "./apertura";

export default async function AperturaPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  if (!isAdminRole(profile)) redirect("/dashboard");
  const org = await getOrganization(profile.organization_id);
  const hoy = todayInTimeZone((org?.timezone as string) || undefined);

  const db = createAdminClient();
  const [{ data: deudas }, { data: favores }] = await Promise.all([
    db.from("invoices").select("unit_id, amount, paid_amount, due_date, created_at").eq("organization_id", profile.organization_id).eq("kind", "opening").neq("status", "cancelled"),
    db.from("unit_credits").select("amount").eq("organization_id", profile.organization_id).like("note", "Saldo de apertura%"),
  ]);
  const totalDeuda = (deudas ?? []).reduce((s, d) => s + Number(d.amount), 0);
  const totalFavor = (favores ?? []).reduce((s, d) => s + Number(d.amount), 0);
  // La deuda puede venir mes a mes: una unidad tiene entonces varios saldos anteriores.
  const unidadesConDeuda = new Set((deudas ?? []).map((d) => d.unit_id as string)).size;
  // El día de corte es el día en que se registró la carga, no el vencimiento de cada mes.
  const registrado = (deudas ?? []).map((d) => d.created_at as string).sort().at(-1);
  const corte = registrado
    ? new Date(registrado).toLocaleDateString("es-VE", { timeZone: (org?.timezone as string) || "America/Caracas", day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  return (
    <div className="space-y-8">
      <Encabezado
        eyebrow="CONTABILIDAD"
        titulo="Saldos de apertura"
        descripcion="Lo que cada unidad debía, o tenía a favor, el día en que el condominio empezó con Atryum. Se carga una sola vez, desde la planilla de cuentas por cobrar de la junta."
      />
      <Pestanas items={PESTANAS_CUENTAS} actual="/admin/cuentas/apertura" />
      <Cifras>
        <Cifra etiqueta="DEUDA DE APERTURA" valor={usd(totalDeuda)} detalle={`${unidadesConDeuda} unidades, ${deudas?.length ?? 0} saldos`} />
        <Cifra etiqueta="A FAVOR DE APERTURA" valor={usd(totalFavor)} detalle={`${favores?.length ?? 0} unidades`} />
        <Cifra etiqueta="FECHA DE CORTE" valor={corte} detalle="El día en que se registró el saldo anterior" />
        <Cifra etiqueta="ESTADO" valor={deudas?.length || favores?.length ? "Cargado" : "Pendiente"} tono={deudas?.length || favores?.length ? "bien" : "neutro"} />
      </Cifras>
      <Apertura hoy={hoy} />
    </div>
  );
}
