import Link from "next/link";
import { todayInTimeZone } from "@/lib/utils";
import { resumenFondo } from "@/lib/contabilidad/fondo-reserva";
import { createAdminClient } from "@/lib/supabase/admin";
import { esGastoDelPeriodo, gastoEnUsd, ingresoEnUsd, saldosPorPagar, salidaEnUsd, serieDeTasas, textoPeriodo } from "@/lib/contabilidad/gastos";
import { estaAbierta, pendienteDe } from "@/lib/cuotas";
import { IconoCategoria } from "@/components/ui/icono";
import { bs, usd } from "@/lib/format";
import {
  getCurrentProfile,
  getEffectiveRole,
  getExpenseCategories,
  getCurrentBudget,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { signStorageRefs } from "@/lib/storage";
import { executedByCategory } from "@/lib/budget";
import { NewExpenseDialog } from "./new-expense-dialog";
import { NewIncomeDialog, VoidIncome } from "./new-income-dialog";
import { VoidExpenseDialog } from "./void-expense-dialog";
import { BudgetProgressCard } from "@/components/budget/budget-progress-card";
import type { ExpenseCategory, OrgBudget, OrgBudgetItem } from "@/types/database";

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  currency?: string | null;
  /** Monto en la moneda original, si no era dólares. */
  monto_original?: number | null;
  /** Lo que sale del banco, en dólares. */
  salida_usd?: number;
  tipo_contable?: string | null;
  retencion_islr?: number | string | null;
  expense_date: string;
  receipt_url: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  category_id: string;
  vendor_id: string | null;
  expense_categories: { id: string; code: string; label: string; icon: string | null } | null;
  vendors: { id: string; name: string } | null;
  cost_center_id: string | null;
  paid_from_reserve: boolean;
  reserve_acta: string | null;
  cost_centers: { id: string; name: string } | null;
}

interface IngresoRow {
  id: string;
  income_date: string;
  description: string;
  source: string | null;
  amount: number;
  currency?: string | null;
  /** Monto en bolívares, si entró en bolívares. */
  monto_original?: number | null;
  receipt_url: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  cost_centers: { name: string } | null;
}

export default async function FinanzasPage({ searchParams }: { searchParams: Promise<{ centro?: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;

  const isAdmin =
    getEffectiveRole(profile) === "admin" ||
    getEffectiveRole(profile) === "super_admin";

  const supabase = await createClient();

  const currentYear = new Date().getFullYear();

  const { centro: centroElegido } = await searchParams;

  const [invoicesRes, expensesRes, transactionsRes, categoriesData, currentBudgetData, otrosRes, centrosRes, fondo] = await Promise.all([
    supabase
      .from("invoices")
      .select("amount, paid_amount, status")
      .eq("organization_id", profile.organization_id),
    supabase
      .from("expense_records")
      .select(
        "id, description, amount, currency, expense_date, receipt_url, voided_at, voided_reason, category_id, vendor_id, cost_center_id, paid_from_reserve, reserve_acta, tipo_contable, retencion_islr, expense_categories(id, code, label, icon), vendors(id, name), cost_centers(id, name)",
      )
      .eq("organization_id", profile.organization_id)
      .order("expense_date", { ascending: false }),
    supabase
      .from("transactions")
      .select("amount, paid_at, invoices!inner(organization_id)")
      .eq("invoices.organization_id", profile.organization_id)
      .eq("status", "approved")
      .neq("payment_method", "credit")
      .order("paid_at", { ascending: false }),
    getExpenseCategories(profile.organization_id),
    getCurrentBudget(profile.organization_id, currentYear),
    supabase
      .from("other_incomes")
      .select("id, income_date, description, source, amount, currency, receipt_url, voided_at, voided_reason, cost_centers(name)")
      .eq("organization_id", profile.organization_id)
      .order("income_date", { ascending: false }),
    supabase
      .from("cost_centers")
      .select("id, name")
      .eq("organization_id", profile.organization_id)
      .eq("active", true)
      .order("position")
      .order("name"),
    // Con el cliente de servicio: solo salen agregados, y un vecino no puede leer las cuotas de los demás.
    resumenFondo(createAdminClient(), profile.organization_id),
  ]);

  const expensesRaw = (expensesRes.data ?? []) as unknown as ExpenseRow[];
  // El bucket es privado (migration 030): `receipt_url` guarda una referencia
  // `bucket/path`, no una URL navegable. Se firma en el servidor.
  const firmasRecibos = await signStorageRefs(expensesRaw.map((e) => e.receipt_url));
  // Todo en dólares: un gasto en bolívares se convierte a la tasa BCV de su día.
  const tasas = await serieDeTasas(supabase, profile.organization_id);
  const expensesAll: ExpenseRow[] = expensesRaw.map((e, i) => ({
    ...e,
    amount: gastoEnUsd(e, tasas),
    salida_usd: salidaEnUsd(e, tasas),
    monto_original: e.currency && e.currency !== "USD" ? Number(e.amount) : null,
    receipt_url: firmasRecibos[i],
  }));
  // Filtrar voided (no cuentan en totales ni gráficos)
  const noAnulados = expensesAll.filter((e) => e.voided_at === null);
  // Pagar una provisión o enterar retenciones salda una deuda: no es gasto del período.
  const expenses = noAnulados.filter(esGastoDelPeriodo);
  const transactions = transactionsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const categories = (categoriesData ?? []) as ExpenseCategory[];

  const ingresosRaw = (otrosRes.data ?? []) as unknown as IngresoRow[];
  const firmasIngresos = await signStorageRefs(ingresosRaw.map((o) => o.receipt_url));
  const otrosIngresos = ingresosRaw.map((o, i) => ({
    ...o,
    amount: ingresoEnUsd(o, tasas),
    monto_original: o.currency && o.currency !== "USD" ? Number(o.amount) : null,
    receipt_url: firmasIngresos[i],
  }));
  const totalOtros = otrosIngresos.filter((o) => !o.voided_at).reduce((s, o) => s + Number(o.amount), 0);
  const centros = (centrosRes.data ?? []) as { id: string; name: string }[];

  const totalIncome = transactions.reduce((s, t) => s + Number(t.amount), 0) + totalOtros;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  // Un gasto con el fondo resta aquí, así que lo que el fondo trajo tiene que
  // sumar: si no, el balance sale negativo con dinero en el banco.
  const aportesFondo = Math.round((fondo.inicial + fondo.aportes + fondo.ajustes) * 100) / 100;
  // El balance es dinero: una provisión todavía no sale del banco y lo retenido sale al enterarlo.
  const totalSalidas = noAnulados.reduce((s, e) => s + Number(e.salida_usd ?? e.amount), 0);
  const balance = totalIncome + aportesFondo - totalSalidas;
  const porPagar = isAdmin ? await saldosPorPagar(createAdminClient(), profile.organization_id) : undefined;
  const totalPending = invoices
    .filter((i) => estaAbierta(i.status as string))
    .reduce((s, i) => s + pendienteDe(i), 0);

  // Aggregate por category_id usando la tabla normalizada
  const byCategoryId: Record<string, number> = {};
  for (const e of expenses) {
    byCategoryId[e.category_id] = (byCategoryId[e.category_id] ?? 0) + Number(e.amount);
  }

  // El progreso del presupuesto compara contra el presupuesto de UN año, así que
  // lo ejecutado también tiene que filtrarse por año. `byCategoryId` suma todo el
  // histórico y se queda para el gráfico de distribución, que sí es acumulado.
  const ejecutadoDelAno = executedByCategory(
    expensesAll.filter((e) => !e.paid_from_reserve && esGastoDelPeriodo(e)).map((e) => ({
      category_id: e.category_id as string,
      amount: Number(e.amount),
      expense_date: e.expense_date as string,
      voided_at: e.voided_at as string | null,
    })),
    currentYear,
  );

  // Budget approved: solo mostrar tarjeta si está approved
  const currentBudget = currentBudgetData?.budget as OrgBudget | undefined;
  const currentBudgetItems = (currentBudgetData?.items as OrgBudgetItem[] | undefined) ?? [];
  const showBudgetCard = currentBudget?.status === "approved" && currentBudgetItems.length > 0;
  // Fallback de labels desde el join, por si una categoría fue desactivada
  // (no aparece en `categories`, que solo trae las activas) pero tiene gastos históricos.
  const joinedCatById: Record<string, { label: string; icon: string | null }> = {};
  for (const e of expensesAll) {
    if (e.expense_categories) {
      joinedCatById[e.expense_categories.id] = {
        label: e.expense_categories.label,
        icon: e.expense_categories.icon,
      };
    }
  }
  // Gastos por centro de costo. Los que no tienen uno también se muestran: son dinero real.
  const porCentro = new Map<string, { id: string; label: string; amount: number }>();
  for (const e of expenses) {
    const id = e.cost_center_id ?? "sin-centro";
    const fila = porCentro.get(id) ?? { id, label: e.cost_centers?.name ?? "Sin centro de costo", amount: 0 };
    fila.amount += Number(e.amount);
    porCentro.set(id, fila);
  }
  const centroEntries = [...porCentro.values()].sort((a, b) => b.amount - a.amount);
  const hayCentros = centroEntries.some((c) => c.id !== "sin-centro");
  const gastosVisibles = centroElegido
    ? expensesAll.filter((e) => (e.cost_center_id ?? "sin-centro") === centroElegido)
    : expensesAll;
  const hoy = todayInTimeZone();

  const categoryEntries = Object.entries(byCategoryId)
    .map(([id, amount]) => {
      const cat = categories.find((c) => c.id === id) ?? joinedCatById[id];
      return {
        id,
        label: cat?.label ?? "Sin categoría",
        icon: cat?.icon ?? null,
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-meta-loose text-cyan-ink">FINANZAS</span>
          <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
            Transparencia <em className="font-editorial text-cyan">financiera</em>
          </h1>
          <p className="mt-3 text-[15px] text-mute">
            Exactamente en qué se gasta el dinero de tu condominio.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap justify-end gap-2">
            <NewIncomeDialog centros={centros} hoy={hoy} tasas={tasas} />
            <NewExpenseDialog categories={categories} centros={centros} saldoFondo={fondo.saldo} tasas={tasas} porPagar={porPagar} />
          </div>
        )}
      </div>

      <p className="-mt-4 text-[13px] text-mute">
        Acumulado: {textoPeriodo([...transactions.map((t) => t.paid_at as string), ...otrosIngresos.filter((o) => !o.voided_at).map((o) => o.income_date), ...expenses.map((e) => e.expense_date)], hoy)}. En dólares.
      </p>
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">RECAUDADO</p>
          <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-cyan">
            {usd(totalIncome)}
          </p>
          {totalOtros > 0 && <p className="mt-2 text-[12px] text-mute">Incluye {usd(totalOtros)} de otros ingresos</p>}
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">GASTOS</p>
          <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-marine-deep">
            {usd(totalExpenses)}
          </p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">BALANCE</p>
          <p
            className={`mt-3 font-display text-[28px] leading-none tracking-[-0.02em] ${
              balance >= 0 ? "text-marine-deep" : "text-destructive"
            }`}
          >
            {usd(balance)}
          </p>
          {aportesFondo !== 0 && <p className="mt-2 text-[12px] text-mute">Incluye {usd(aportesFondo)} del saldo inicial y los aportes del fondo</p>}
        </div>
        <div className="rounded-2xl bg-card border border-border p-5">
          <p className="font-meta text-mute">POR COBRAR</p>
          <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-ember">
            {usd(totalPending)}
          </p>
        </div>
      </div>

      {/* Fondo de reserva: el dinero que el condominio guarda aparte */}
      {(fondo.saldo !== 0 || fondo.porCobrar !== 0 || fondo.usado !== 0) && (
        <div className="rounded-2xl bg-card border border-border p-6">
          <p className="font-meta text-mute">FONDO DE RESERVA</p>
          <p className="mt-3 font-display text-[28px] leading-none tracking-[-0.02em] text-marine-deep">{usd(fondo.saldo)}</p>
          <p className="mt-3 text-[14px] text-mute">
            Disponible. Del balance de arriba, esta parte está reservada.
            {fondo.porCobrar > 0 && ` Faltan por cobrar ${usd(fondo.porCobrar)} de las cuotas emitidas.`}
            {fondo.usado > 0 && ` Se han usado ${usd(fondo.usado)}.`}
          </p>
          {isAdmin && (
            <Link href="/admin/fondo-reserva" className="mt-3 inline-block text-[13px] text-cyan-ink hover:underline">
              Ver movimientos
            </Link>
          )}
        </div>
      )}

      {/* Presupuesto vigente del año (si approved) */}
      {showBudgetCard && currentBudget && (
        <BudgetProgressCard
          budget={currentBudget}
          items={currentBudgetItems}
          executedByCategoryId={ejecutadoDelAno}
          categories={categories}
        />
      )}

      {/* Gastos por categoría */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="font-meta text-mute">GASTOS POR CATEGORÍA</p>
        <p className="mt-2 text-[15px] font-medium text-marine-deep mb-6">
          Distribución del gasto total
        </p>

        {categoryEntries.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-mute">No hay gastos registrados</p>
        ) : (
          <div className="space-y-5">
            {categoryEntries.map(({ id, label, icon, amount }) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              return (
                <div key={id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-medium text-marine-deep">
                      <IconoCategoria icono={icon} className="mr-2 inline h-4 w-4 align-[-2px] text-cyan-ink" />
                      {label}
                    </span>
                    <div>
                      <span className="text-[14px] font-medium text-marine-deep">{usd(amount)}</span>
                      <span className="font-meta text-mute ml-3">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-cloud overflow-hidden">
                    <div
                      className="h-full rounded-full bg-cyan transition-[border-color,box-shadow,transform,background-color] duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gastos por centro de costo */}
      {hayCentros && (
        <div className="rounded-2xl bg-card border border-border p-6">
          <p className="font-meta text-mute">GASTOS POR CENTRO DE COSTO</p>
          <p className="mt-2 text-[15px] font-medium text-marine-deep mb-6">A qué parte del condominio corresponde cada gasto</p>
          <div className="space-y-5">
            {centroEntries.map(({ id, label, amount }) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              return (
                <div key={id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-medium text-marine-deep">{label}</span>
                    <div>
                      <span className="text-[14px] font-medium text-marine-deep">{usd(amount)}</span>
                      <span className="font-meta text-mute ml-3">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-cloud overflow-hidden">
                    <div className="h-full rounded-full bg-cyan" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detalle */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="font-meta text-mute">DETALLE</p>
        <p className="mt-2 text-[15px] font-medium text-marine-deep mb-5">
          Cada gasto documentado{" "}
          {expensesAll.length !== expenses.length && (
            <span className="font-meta text-mute">
              · {expensesAll.length - expenses.length} ANULADO{expensesAll.length - expenses.length > 1 ? "S" : ""}
            </span>
          )}
        </p>

        {hayCentros && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            <Link
              href="/finanzas"
              className={`rounded-full px-3 py-1 text-[12px] ${!centroElegido ? "bg-marine-deep text-frost" : "border border-border text-marine-deep/70"}`}
            >
              Todos
            </Link>
            {centroEntries.map((c) => (
              <Link
                key={c.id}
                href={`/finanzas?centro=${c.id}`}
                className={`rounded-full px-3 py-1 text-[12px] ${centroElegido === c.id ? "bg-marine-deep text-frost" : "border border-border text-marine-deep/70"}`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        )}

        {gastosVisibles.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-mute">No hay gastos registrados</p>
        ) : (
          <div className="space-y-0">
            {gastosVisibles.map((expense) => {
              const cat = expense.expense_categories;
              const vendor = expense.vendors;
              const voided = expense.voided_at !== null;
              return (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between py-3.5 border-b border-border last:border-0 ${voided ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconoCategoria icono={cat?.icon} className="h-4 w-4 shrink-0 text-cyan-ink" />
                    <div className="min-w-0">
                      <p
                        className={`text-[14px] font-medium text-marine-deep truncate ${voided ? "line-through" : ""}`}
                      >
                        {expense.description}
                        {vendor && (
                          <span className="ml-2 font-meta text-cyan-ink">· {vendor.name.toUpperCase()}</span>
                        )}
                        {voided && (
                          <span className="ml-2 font-meta bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                            ANULADO
                          </span>
                        )}
                      </p>
                      <p className="font-meta text-mute truncate">
                        {(cat?.label ?? "Sin categoría").toUpperCase()} ·{" "}
                        {expense.cost_centers && <>{expense.cost_centers.name.toUpperCase()} ·{" "}</>}
                        {new Date(expense.expense_date).toLocaleDateString("es", {
                          day: "numeric",
                          month: "short",
                        }).toUpperCase()}
                      </p>
                      {expense.paid_from_reserve && (
                        <p className="mt-1 text-[12px] text-mute whitespace-normal">
                          Pagado con el fondo de reserva{expense.reserve_acta ? ` · ${expense.reserve_acta}` : ""}
                        </p>
                      )}
                      {expense.tipo_contable && expense.tipo_contable !== "gasto" && (
                        <p className="mt-1 text-[12px] text-mute whitespace-normal">
                          {expense.tipo_contable === "provision"
                            ? "Provisión: todavía no sale del banco"
                            : expense.tipo_contable === "pago_provision"
                              ? "Pago de una provisión"
                              : "Entero de retenciones de ISLR"}
                        </p>
                      )}
                      {Number(expense.retencion_islr ?? 0) > 0 && (
                        <p className="mt-1 text-[12px] text-mute whitespace-normal">
                          Retención de ISLR: {expense.monto_original != null ? bs(Number(expense.retencion_islr)) : usd(Number(expense.retencion_islr))}
                        </p>
                      )}
                      {voided && expense.voided_reason && (
                        <p className="mt-1 text-[12px] text-destructive/80 italic whitespace-normal">
                          Motivo de anulación: {expense.voided_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {expense.receipt_url && (
                      <a
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-8 w-8 rounded-md border border-border overflow-hidden hover:opacity-80"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={expense.receipt_url} alt="Recibo" className="h-full w-full object-cover" />
                      </a>
                    )}
                    <span className={`text-[14px] font-medium text-marine-deep ${voided ? "line-through" : ""}`}>
                      −{usd(Number(expense.amount))}
                      {expense.monto_original != null && (
                        <span className="block text-right text-[11px] font-normal text-mute">
                          Bs {expense.monto_original.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </span>
                    {isAdmin && !voided && (
                      <VoidExpenseDialog
                        expenseId={expense.id}
                        expenseDescription={expense.description}
                        expenseAmount={Number(expense.amount)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Otros ingresos */}
      {otrosIngresos.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-6">
          <p className="font-meta text-mute">OTROS INGRESOS</p>
          <p className="mt-2 text-[15px] font-medium text-marine-deep mb-5">Dinero que entró sin ser el pago de una cuota</p>
          <div className="space-y-0">
            {otrosIngresos.map((o) => {
              const anulado = o.voided_at !== null;
              return (
                <div key={o.id} className={`flex flex-wrap items-center justify-between gap-2 py-3.5 border-b border-border last:border-0 ${anulado ? "opacity-60" : ""}`}>
                  <div className="min-w-0">
                    <p className={`text-[14px] font-medium text-marine-deep ${anulado ? "line-through" : ""}`}>
                      {o.description}
                      {anulado && <span className="ml-2 font-meta bg-destructive/10 text-destructive px-2 py-0.5 rounded">ANULADO</span>}
                    </p>
                    <p className="font-meta text-mute">
                      {o.income_date.split("-").reverse().join("/")}
                      {o.source && <> · {o.source.toUpperCase()}</>}
                      {o.cost_centers && <> · {o.cost_centers.name.toUpperCase()}</>}
                    </p>
                    {anulado && o.voided_reason && <p className="mt-1 text-[12px] text-destructive/80 italic">Motivo de anulación: {o.voided_reason}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {o.receipt_url && (
                      <a href={o.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-cyan-ink hover:underline">
                        Soporte
                      </a>
                    )}
                    <span className={`text-[14px] font-medium text-cyan ${anulado ? "line-through" : ""}`}>
                      +{usd(Number(o.amount))}
                      {o.monto_original != null && (
                        <span className="block text-right text-[11px] font-normal text-mute">{bs(o.monto_original)}</span>
                      )}
                    </span>
                    {isAdmin && !anulado && <VoidIncome id={o.id} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
