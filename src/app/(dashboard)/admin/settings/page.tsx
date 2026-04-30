import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  getEffectiveRole,
  getFeeBreakdownAll,
  getFeeTypeAmounts,
  getOrgUnitTypes,
} from "@/lib/queries";
import { OrgPoliciesForm } from "./org-policies-form";
import { BankAccountsForm } from "./bank-accounts-form";
import { FeeConfigForm } from "./fee-config-form";
import type {
  BankAccount,
  FeeBreakdownItem,
  FeeMode,
  FeeTypeAmount,
  Organization,
} from "@/types/database";

export default async function AdminSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  const effectiveRole = getEffectiveRole(profile);
  if (effectiveRole !== "admin" && effectiveRole !== "super_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single<Organization>();

  if (!org) return null;

  const [feeTypeAmounts, breakdownAll, unitTypes] = await Promise.all([
    getFeeTypeAmounts(org.id),
    getFeeBreakdownAll(org.id),
    getOrgUnitTypes(org.id),
  ]);

  const bankAccounts: BankAccount[] = Array.isArray(org.bank_accounts) ? org.bank_accounts : [];

  return (
    <div className="space-y-8">
      <div>
        <span className="font-meta-loose text-cyan">CONFIGURACIÓN</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
          <em className="font-editorial">{org.name}</em>
        </h1>
        <p className="mt-3 text-[15px] text-mute">
          Datos bancarios, modo de cobranza y políticas para inquilinos.
        </p>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 md:p-7">
        <p className="font-meta text-mute mb-2">DATOS BANCARIOS DEL CONDOMINIO</p>
        <p className="text-[14px] text-marine-deep/80 leading-relaxed mb-6">
          Las cuentas activas se muestran a los residentes en /pagos. Pueden copiarlas con un tap. Si no agregas ninguna,
          /pagos no mostrará información bancaria.
        </p>
        <BankAccountsForm initial={bankAccounts} orgCurrency={org.currency} />
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 md:p-7">
        <FeeConfigForm
          initial={{
            fee_mode: (org.fee_mode ?? "flat") as FeeMode,
            fee_base_amount: org.fee_base_amount,
            late_fee_pct: org.late_fee_pct,
          }}
          initialTypeAmounts={feeTypeAmounts as FeeTypeAmount[]}
          initialBreakdown={breakdownAll as FeeBreakdownItem[]}
          unitTypes={unitTypes}
        />
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 md:p-7">
        <p className="font-meta text-mute mb-2">POLÍTICAS PARA INQUILINOS</p>
        <p className="text-[14px] text-marine-deep/80 leading-relaxed mb-6">
          Decide qué pueden hacer los inquilinos de tu condominio. Cada condominio tiene sus
          reglas; ajusta según corresponda a la ley local y al reglamento interno.
        </p>
        <OrgPoliciesForm
          initial={{
            tenant_can_vote: org.tenant_can_vote,
            tenant_can_see_delinquents: org.tenant_can_see_delinquents,
            tenant_can_reserve: org.tenant_can_reserve,
          }}
        />
      </div>
    </div>
  );
}
