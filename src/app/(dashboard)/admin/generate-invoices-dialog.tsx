"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateMonthlyInvoices } from "./admin-actions";
import {
  computeInvoiceAmounts,
  type ComputeUnit,
} from "@/lib/cobranza/compute-invoices";
import {
  FEE_MODES,
  FEE_MODE_DESCRIPTIONS,
  FEE_MODE_LABELS,
  UNIT_TYPE_LABELS,
} from "@/lib/schemas/fee-config";
import type { FeeMode, FeeTypeAmount, InvoiceKind, Organization } from "@/types/database";

type StepperStep = "kind" | "period" | "mode" | "manual" | "preview" | "done";

interface DialogProps {
  org: Organization;
  units: Array<ComputeUnit & { unit_number: string; block: string | null }>;
  feeTypeAmounts: FeeTypeAmount[];
  exchangeRate: number | null;
}

interface FormState {
  kind: InvoiceKind;
  // monthly
  month: string;
  year: string;
  due_day: string;
  // extraordinary
  due_date: string;
  description: string;
  // mode
  mode: FeeMode;
  flat_amount: string;
  total_amount: string; // divide_total
  base_amount: string;
  manual_amounts: Record<string, string>; // unit_id -> string
}

function defaultMonthYear() {
  const now = new Date();
  const next = now.getMonth() + 2;
  const month = next > 12 ? "1" : String(next);
  const year = next > 12 ? String(now.getFullYear() + 1) : String(now.getFullYear());
  return { month, year };
}

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function GenerateInvoicesDialog({ org, units, feeTypeAmounts, exchangeRate }: DialogProps) {
  const { month: defMonth, year: defYear } = defaultMonthYear();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<StepperStep>("kind");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [postWarnings, setPostWarnings] = useState<string[]>([]);

  const [form, setForm] = useState<FormState>(() => ({
    kind: "monthly",
    month: defMonth,
    year: defYear,
    due_day: "15",
    due_date: "",
    description: "",
    mode: (org.fee_mode ?? "flat") as FeeMode,
    flat_amount: "",
    total_amount: "",
    base_amount: org.fee_base_amount ? String(org.fee_base_amount) : "",
    manual_amounts: Object.fromEntries(units.map((u) => [u.id, ""])),
  }));

  const typeAmountsMap = useMemo(
    () => Object.fromEntries(feeTypeAmounts.map((r) => [r.unit_type, Number(r.amount)])),
    [feeTypeAmounts],
  );

  const dueDateResolved = useMemo(() => {
    if (form.kind === "extraordinary") return form.due_date;
    if (!form.month || !form.year) return "";
    const day = String(parseInt(form.due_day || "15") || 15).padStart(2, "0");
    return `${form.year}-${form.month.padStart(2, "0")}-${day}`;
  }, [form.kind, form.month, form.year, form.due_day, form.due_date]);

  const descriptionResolved = useMemo(() => {
    if (form.description.trim()) return form.description.trim();
    if (form.kind === "monthly") {
      const monthName = MONTH_LABELS[parseInt(form.month) - 1] ?? form.month;
      return `Cuota ${monthName} ${form.year}`;
    }
    return "Derrama extraordinaria";
  }, [form.description, form.kind, form.month, form.year]);

  const previewResult = useMemo(() => {
    if (step !== "preview") return null;
    return computeInvoiceAmounts({
      organization_id: org.id,
      fee_mode: form.mode,
      due_date: dueDateResolved,
      description: descriptionResolved,
      kind: form.kind,
      currency: org.currency || "USD",
      units,
      exchange_rate: exchangeRate,
      flat_amount: form.flat_amount ? parseFloat(form.flat_amount) : undefined,
      divide_total_amount: form.total_amount ? parseFloat(form.total_amount) : undefined,
      base_amount: form.base_amount ? parseFloat(form.base_amount) : undefined,
      type_amounts: form.mode === "by_type" ? typeAmountsMap : undefined,
      manual_amounts:
        form.mode === "manual"
          ? Object.fromEntries(
              Object.entries(form.manual_amounts).map(([k, v]) => [k, parseFloat(v) || 0]),
            )
          : undefined,
    });
  }, [step, org.id, org.currency, form, dueDateResolved, descriptionResolved, units, exchangeRate, typeAmountsMap]);

  function reset() {
    const d = defaultMonthYear();
    setStep("kind");
    setError("");
    setResultMsg(null);
    setPostWarnings([]);
    setForm({
      kind: "monthly",
      month: d.month,
      year: d.year,
      due_day: "15",
      due_date: "",
      description: "",
      mode: (org.fee_mode ?? "flat") as FeeMode,
      flat_amount: "",
      total_amount: "",
      base_amount: org.fee_base_amount ? String(org.fee_base_amount) : "",
      manual_amounts: Object.fromEntries(units.map((u) => [u.id, ""])),
    });
  }

  function nextStep() {
    setError("");
    if (step === "kind") return setStep("period");
    if (step === "period") {
      if (form.kind === "extraordinary" && !form.due_date) {
        setError("Selecciona fecha de vencimiento");
        return;
      }
      if (form.kind === "extraordinary" && !form.description.trim()) {
        setError("Las derramas requieren descripción");
        return;
      }
      return setStep("mode");
    }
    if (step === "mode") {
      if (form.mode === "flat" && (!form.flat_amount || parseFloat(form.flat_amount) <= 0)) {
        setError("Indica un monto > 0");
        return;
      }
      if (form.mode === "divide_total" && (!form.total_amount || parseFloat(form.total_amount) <= 0)) {
        setError("Indica el costo total a repartir (> 0)");
        return;
      }
      if (form.mode === "by_aliquot" && (!form.base_amount || parseFloat(form.base_amount) <= 0)) {
        setError("Indica un monto base > 0");
        return;
      }
      if (form.mode === "by_type") {
        const missing = units
          .map((u) => u.type)
          .filter((t) => typeAmountsMap[t] === undefined);
        if (missing.length > 0) {
          setError(`Faltan montos para tipos: ${[...new Set(missing)].join(", ")}. Configúralos en Ajustes.`);
          return;
        }
      }
      if (form.mode === "manual") return setStep("manual");
      return setStep("preview");
    }
    if (step === "manual") {
      const missing = units.filter((u) => !form.manual_amounts[u.id] || isNaN(parseFloat(form.manual_amounts[u.id])));
      if (missing.length > 0) {
        setError(`Faltan ${missing.length} monto(s)`);
        return;
      }
      return setStep("preview");
    }
  }

  function prevStep() {
    setError("");
    if (step === "preview" && form.mode === "manual") return setStep("manual");
    if (step === "preview") return setStep("mode");
    if (step === "manual") return setStep("mode");
    if (step === "mode") return setStep("period");
    if (step === "period") return setStep("kind");
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    setPostWarnings([]);
    const fd = new FormData();
    fd.set("kind", form.kind);
    fd.set("mode", form.mode);
    fd.set("description", descriptionResolved);
    if (form.kind === "extraordinary") {
      fd.set("due_date", form.due_date);
    } else {
      fd.set("month", form.month);
      fd.set("year", form.year);
      fd.set("due_day", form.due_day);
    }
    if (form.mode === "flat") fd.set("flat_amount", form.flat_amount);
    if (form.mode === "divide_total") fd.set("total_amount", form.total_amount);
    if (form.mode === "by_aliquot") fd.set("base_amount", form.base_amount);
    if (form.mode === "manual") {
      const cleaned = Object.fromEntries(
        Object.entries(form.manual_amounts).map(([k, v]) => [k, parseFloat(v) || 0]),
      );
      fd.set("manual_amounts", JSON.stringify(cleaned));
    }

    const res = await generateMonthlyInvoices(fd);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    if ("count" in res) {
      setResultMsg(`${res.count} cuota${res.count !== 1 ? "s" : ""} generada${res.count !== 1 ? "s" : ""}`);
      if ("warnings" in res && res.warnings && res.warnings.length > 0) {
        setPostWarnings(res.warnings);
      }
    }
    setStep("done");
    setLoading(false);
  }

  function close() {
    setOpen(false);
    setTimeout(() => reset(), 200);
    if (step === "done") {
      window.location.reload();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTimeout(() => reset(), 200);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <svg
          className="mr-1.5 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Generar cuotas
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar cuotas</DialogTitle>
          <DialogDescription>
            {step === "done"
              ? "Listo"
              : `Paso ${stepIndex(step, form.mode)} de ${totalSteps(form.mode)} · ${stepLabel(step)}`}
          </DialogDescription>
        </DialogHeader>

        {step === "kind" && (
          <KindStep form={form} onChange={setForm} />
        )}

        {step === "period" && (
          <PeriodStep form={form} onChange={setForm} />
        )}

        {step === "mode" && (
          <ModeStep
            form={form}
            onChange={setForm}
            feeTypeAmounts={feeTypeAmounts}
            unitsTypes={[...new Set(units.map((u) => u.type))]}
          />
        )}

        {step === "manual" && (
          <ManualStep
            units={units}
            currency={org.currency || "USD"}
            manual_amounts={form.manual_amounts}
            onChange={(map) => setForm((f) => ({ ...f, manual_amounts: map }))}
          />
        )}

        {step === "preview" && previewResult && (
          <PreviewStep
            result={previewResult}
            units={units}
            currency={org.currency || "USD"}
            description={descriptionResolved}
            dueDate={dueDateResolved}
            kind={form.kind}
          />
        )}

        {step === "done" && (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg
                className="h-7 w-7 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold">{resultMsg}</p>
            {postWarnings.length > 0 && (
              <div className="text-left text-[12px] bg-amber-50 border border-amber-200 rounded p-2 space-y-1">
                {postWarnings.map((w, i) => (
                  <p key={i} className="text-amber-800">
                    ⚠ {w}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded p-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          {step === "done" ? (
            <Button onClick={close} className="flex-1">
              Entendido
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={loading || step === "kind"}
                onClick={prevStep}
              >
                Volver
              </Button>
              {step === "preview" ? (
                <Button
                  type="button"
                  className="flex-1"
                  disabled={
                    loading ||
                    !previewResult ||
                    previewResult.errors.length > 0
                  }
                  onClick={handleSubmit}
                >
                  {loading ? "Generando…" : "Confirmar y generar"}
                </Button>
              ) : (
                <Button type="button" className="flex-1" disabled={loading} onClick={nextStep}>
                  Siguiente
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ──────────────────────────────────────────────

function stepOrder(mode: FeeMode): StepperStep[] {
  // El paso "manual" (montos unidad por unidad) solo aplica en modo manual.
  // "done" es la pantalla de confirmación, no cuenta como paso del wizard.
  return mode === "manual"
    ? ["kind", "period", "mode", "manual", "preview"]
    : ["kind", "period", "mode", "preview"];
}

function stepIndex(s: StepperStep, mode: FeeMode): number {
  const i = stepOrder(mode).indexOf(s);
  return i === -1 ? stepOrder(mode).length : i + 1;
}

function totalSteps(mode: FeeMode): number {
  return stepOrder(mode).length;
}

/** Convierte ISO "yyyy-mm-dd" a "dd/mm/yyyy" sin riesgo de off-by-one por zona horaria. */
function formatDueDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function stepLabel(s: StepperStep): string {
  switch (s) {
    case "kind": return "Tipo";
    case "period": return "Período";
    case "mode": return "Modo de cobranza";
    case "manual": return "Montos por unidad";
    case "preview": return "Vista previa";
    default: return "";
  }
}

// ── Steps ──────────────────────────────────────────────

function KindStep({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (f: FormState | ((p: FormState) => FormState)) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[14px] text-marine-deep/80">
        ¿Qué tipo de cobro quieres generar?
      </p>
      <div className="grid grid-cols-1 gap-3">
        <label
          className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
            form.kind === "monthly" ? "border-primary bg-primary/5" : "hover:border-primary"
          }`}
        >
          <input
            type="radio"
            name="kind"
            checked={form.kind === "monthly"}
            onChange={() => onChange((p) => ({ ...p, kind: "monthly" }))}
            className="mt-1 h-4 w-4 cursor-pointer"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold">Cuota mensual</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cobro recurrente del mes. Una por unidad.
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
            form.kind === "extraordinary" ? "border-primary bg-primary/5" : "hover:border-primary"
          }`}
        >
          <input
            type="radio"
            name="kind"
            checked={form.kind === "extraordinary"}
            onChange={() => onChange((p) => ({ ...p, kind: "extraordinary" }))}
            className="mt-1 h-4 w-4 cursor-pointer"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold">Derrama extraordinaria</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cobro puntual con fecha libre y descripción obligatoria. Pintura de fachada, reparación de techo,
              cuota especial aprobada en asamblea, etc.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}

function PeriodStep({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (f: FormState | ((p: FormState) => FormState)) => void;
}) {
  if (form.kind === "extraordinary") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ext-due-date">Fecha de vencimiento</Label>
          <Input
            id="ext-due-date"
            type="date"
            value={form.due_date}
            onChange={(e) => onChange((p) => ({ ...p, due_date: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ext-desc">Descripción</Label>
          <Input
            id="ext-desc"
            value={form.description}
            placeholder="Ej: Reparación portón, pintura fachada"
            maxLength={120}
            onChange={(e) => onChange((p) => ({ ...p, description: e.target.value }))}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="month">Mes</Label>
          <select
            id="month"
            value={form.month}
            onChange={(e) => onChange((p) => ({ ...p, month: e.target.value }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {MONTH_LABELS.map((m, i) => (
              <option key={i} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Año</Label>
          <Input
            id="year"
            type="number"
            min="2024"
            max="2099"
            value={form.year}
            onChange={(e) => onChange((p) => ({ ...p, year: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="due_day">Día de vencimiento</Label>
        <Input
          id="due_day"
          type="number"
          min="1"
          max="28"
          value={form.due_day}
          onChange={(e) => onChange((p) => ({ ...p, due_day: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="month-desc">Descripción (opcional)</Label>
        <Input
          id="month-desc"
          value={form.description}
          placeholder={`Cuota ${MONTH_LABELS[parseInt(form.month) - 1] ?? ""} ${form.year}`}
          maxLength={120}
          onChange={(e) => onChange((p) => ({ ...p, description: e.target.value }))}
        />
      </div>
    </div>
  );
}

function ModeStep({
  form,
  onChange,
  feeTypeAmounts,
  unitsTypes,
}: {
  form: FormState;
  onChange: (f: FormState | ((p: FormState) => FormState)) => void;
  feeTypeAmounts: FeeTypeAmount[];
  unitsTypes: string[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {FEE_MODES.map((m) => (
          <label
            key={m}
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
              form.mode === m ? "border-primary bg-primary/5" : "hover:border-primary"
            }`}
          >
            <input
              type="radio"
              name="mode"
              checked={form.mode === m}
              onChange={() => onChange((p) => ({ ...p, mode: m }))}
              className="mt-1 h-4 w-4 cursor-pointer"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">{FEE_MODE_LABELS[m]}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{FEE_MODE_DESCRIPTIONS[m]}</p>
            </div>
          </label>
        ))}
      </div>

      {form.mode === "flat" && (
        <div className="space-y-2 rounded-lg bg-cyan/5 border border-cyan/20 p-3">
          <Label htmlFor="flat-amount">Monto por unidad</Label>
          <Input
            id="flat-amount"
            type="number"
            step="0.01"
            min="0"
            value={form.flat_amount}
            placeholder="85.00"
            onChange={(e) => onChange((p) => ({ ...p, flat_amount: e.target.value }))}
          />
        </div>
      )}

      {form.mode === "divide_total" && (
        <div className="space-y-2 rounded-lg bg-cyan/5 border border-cyan/20 p-3">
          <Label htmlFor="total-amount">Costo total a repartir</Label>
          <Input
            id="total-amount"
            type="number"
            step="0.01"
            min="0"
            value={form.total_amount}
            placeholder="10000.00"
            onChange={(e) => onChange((p) => ({ ...p, total_amount: e.target.value }))}
          />
          <p className="text-[12px] text-mute">
            El sistema lo divide en partes iguales entre todas las unidades. Lo verás dividido en la vista previa.
          </p>
        </div>
      )}

      {form.mode === "by_aliquot" && (
        <div className="space-y-2 rounded-lg bg-cyan/5 border border-cyan/20 p-3">
          <Label htmlFor="base-amount">Total a cobrar</Label>
          <Input
            id="base-amount"
            type="number"
            step="0.01"
            min="0"
            value={form.base_amount}
            placeholder="5200.00"
            onChange={(e) => onChange((p) => ({ ...p, base_amount: e.target.value }))}
          />
          <p className="text-[12px] text-mute">
            Se reparte proporcional a la alícuota de cada unidad. El total cobrado siempre es exacto.
          </p>
        </div>
      )}

      {form.mode === "by_type" && (
        <div className="space-y-2 rounded-lg bg-cyan/5 border border-cyan/20 p-3">
          <p className="text-[13px] font-semibold text-marine-deep">Montos por tipo (Ajustes)</p>
          {unitsTypes.length === 0 ? (
            <p className="text-[12px] text-mute italic">No hay tipos de unidad detectados.</p>
          ) : (
            <div className="space-y-1.5 text-[13px]">
              {unitsTypes.map((t) => {
                const amt = feeTypeAmounts.find((r) => r.unit_type === t)?.amount;
                return (
                  <div key={t} className="flex items-center justify-between">
                    <span>{UNIT_TYPE_LABELS[t] ?? t}</span>
                    <span className={amt === undefined ? "text-destructive" : "font-mono"}>
                      {amt === undefined ? "Sin configurar" : `$${Number(amt).toFixed(2)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[12px] text-mute">
            Configura los montos en{" "}
            <a href="/admin/settings" className="text-cyan underline">
              /admin/settings
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}

function ManualStep({
  units,
  currency,
  manual_amounts,
  onChange,
}: {
  units: Array<ComputeUnit & { unit_number: string; block: string | null }>;
  currency: string;
  manual_amounts: Record<string, string>;
  onChange: (map: Record<string, string>) => void;
}) {
  const [bulk, setBulk] = useState("");

  function applyBulk() {
    if (!bulk) return;
    const parsed = parseFloat(bulk);
    if (isNaN(parsed)) return;
    const next: Record<string, string> = {};
    for (const u of units) next[u.id] = bulk;
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="bulk-amount">Aplicar a todas</Label>
          <Input
            id="bulk-amount"
            type="number"
            step="0.01"
            min="0"
            value={bulk}
            placeholder="85.00"
            onChange={(e) => setBulk(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={applyBulk}>
          Llenar todo
        </Button>
      </div>

      <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>
              <th className="text-left px-3 py-2 font-meta text-mute">UNIDAD</th>
              <th className="text-left px-3 py-2 font-meta text-mute">TIPO</th>
              <th className="text-right px-3 py-2 font-meta text-mute">MONTO ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-3 py-1.5">
                  {u.block ? `${u.block} · ` : ""}{u.unit_number}
                </td>
                <td className="px-3 py-1.5 text-mute">
                  {UNIT_TYPE_LABELS[u.type] ?? u.type}
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manual_amounts[u.id] ?? ""}
                    onChange={(e) => onChange({ ...manual_amounts, [u.id]: e.target.value })}
                    className="h-8 text-right"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewStep({
  result,
  units,
  currency,
  description,
  dueDate,
  kind,
}: {
  result: ReturnType<typeof computeInvoiceAmounts>;
  units: Array<ComputeUnit & { unit_number: string; block: string | null }>;
  currency: string;
  description: string;
  dueDate: string;
  kind: InvoiceKind;
}) {
  const total = result.invoices.reduce((s, i) => s + i.amount, 0);
  const totalBs = result.invoices.reduce((s, i) => s + (i.amount_bs ?? 0), 0);

  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-cloud/40 border border-border p-3 text-[13px] space-y-1">
        <div className="flex justify-between">
          <span className="text-mute">Tipo</span>
          <span className="font-medium">
            {kind === "monthly" ? "Cuota mensual" : "Derrama extraordinaria"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-mute">Descripción</span>
          <span className="font-medium truncate ml-2">{description}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-mute">Vencimiento</span>
          <span className="font-medium">{formatDueDate(dueDate)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1 mt-1">
          <span className="text-mute">Total ({currency})</span>
          <span className="font-display text-[16px] text-marine-deep">${total.toFixed(2)}</span>
        </div>
        {totalBs > 0 && (
          <div className="flex justify-between text-mute text-[12px]">
            <span>Equivalente Bs</span>
            <span>{totalBs.toFixed(2)}</span>
          </div>
        )}
      </div>

      {result.errors.length > 0 && (
        <div className="rounded-lg bg-destructive/5 border border-destructive/30 p-3 space-y-1">
          {result.errors.map((e, i) => (
            <p key={i} className="text-[13px] text-destructive">
              {e}
            </p>
          ))}
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-[12px] text-amber-800">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      <div className="max-h-[260px] overflow-y-auto rounded-lg border border-border">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>
              <th className="text-left px-3 py-2 font-meta text-mute">UNIDAD</th>
              <th className="text-left px-3 py-2 font-meta text-mute">TIPO</th>
              <th className="text-right px-3 py-2 font-meta text-mute">ALÍCUOTA</th>
              <th className="text-right px-3 py-2 font-meta text-mute">MONTO</th>
            </tr>
          </thead>
          <tbody>
            {result.invoices.map((inv) => {
              const u = unitsById.get(inv.unit_id);
              return (
                <tr key={inv.unit_id} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5">
                    {u?.block ? `${u.block} · ` : ""}{u?.unit_number ?? inv.unit_id.slice(0, 6)}
                  </td>
                  <td className="px-3 py-1.5 text-mute">
                    {u ? (UNIT_TYPE_LABELS[u.type] ?? u.type) : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right text-mute">
                    {u ? `${u.aliquot.toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    ${inv.amount.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
