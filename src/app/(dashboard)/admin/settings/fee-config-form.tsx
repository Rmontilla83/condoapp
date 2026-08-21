"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FEE_MODES,
  FEE_MODE_DESCRIPTIONS,
  FEE_MODE_LABELS,
  UNIT_TYPE_LABELS,
} from "@/lib/schemas/fee-config";
import type {
  FeeBreakdownItem,
  FeeMode,
  FeeTypeAmount,
} from "@/types/database";
import { updateFeeConfig, upsertFeeBreakdownItems } from "./settings-actions";

interface InitialFeeConfig {
  fee_mode: FeeMode;
  fee_base_amount: number | null;
  late_fee_pct: number | null;
}

interface BreakdownDraft {
  id?: string;
  concept: string;
  amount: string;
  is_active: boolean;
  _key: string;
}

interface TypeAmountDraft {
  unit_type: string;
  amount: string;
  _key: string;
}

interface Props {
  initial: InitialFeeConfig;
  initialTypeAmounts: FeeTypeAmount[];
  initialBreakdown: FeeBreakdownItem[];
  unitTypes: string[]; // tipos en uso por las units del condo
}

export function FeeConfigForm({
  initial,
  initialTypeAmounts,
  initialBreakdown,
  unitTypes,
}: Props) {
  const [config, setConfig] = useState<InitialFeeConfig>(initial);

  const [typeAmounts, setTypeAmounts] = useState<TypeAmountDraft[]>(() => {
    const existing = new Map(initialTypeAmounts.map((r) => [r.unit_type, String(r.amount)]));
    const merged = unitTypes.map((t) => ({
      unit_type: t,
      amount: existing.get(t) ?? "",
      _key: t,
    }));
    // Incluir tipos almacenados que ya no están en units (por si quedaron huérfanos)
    initialTypeAmounts.forEach((r) => {
      if (!merged.some((m) => m.unit_type === r.unit_type)) {
        merged.push({ unit_type: r.unit_type, amount: String(r.amount), _key: r.unit_type });
      }
    });
    return merged;
  });

  const [breakdown, setBreakdown] = useState<BreakdownDraft[]>(() =>
    initialBreakdown.map((b) => ({
      id: b.id,
      concept: b.concept,
      amount: String(b.amount),
      is_active: b.is_active,
      _key: b.id,
    })),
  );

  const [pending, startTransition] = useTransition();
  const [breakdownPending, startBreakdownTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  const breakdownTotal = useMemo(
    () =>
      breakdown
        .filter((b) => b.is_active)
        .reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0),
    [breakdown],
  );

  const baseAmountNumeric = parseFloat(config.fee_base_amount?.toString() ?? "") || 0;
  const breakdownVsBaseDelta = config.fee_mode === "by_aliquot"
    ? Math.round((breakdownTotal - baseAmountNumeric) * 100) / 100
    : null;

  function saveConfig() {
    setFeedback(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("config", JSON.stringify(config));

      // Solo enviar type_amounts si modo es by_type (o si admin tiene amounts configurados que quiere preservar)
      const cleanTypeAmounts = typeAmounts
        .filter((r) => r.amount !== "" && parseFloat(r.amount) >= 0)
        .map((r) => ({ unit_type: r.unit_type, amount: parseFloat(r.amount) }));

      if (cleanTypeAmounts.length > 0 || config.fee_mode === "by_type") {
        fd.set("type_amounts", JSON.stringify(cleanTypeAmounts));
      }

      const res = await updateFeeConfig(fd);
      if ("error" in res) {
        setFeedback({ type: "error", msg: res.error });
        return;
      }
      setFeedback({ type: "ok", msg: "Configuración guardada" });
      setTimeout(() => window.location.reload(), 600);
    });
  }

  function saveBreakdown() {
    setFeedback(null);
    startBreakdownTransition(async () => {
      const fd = new FormData();
      const items = breakdown.map((b) => ({
        id: b.id,
        concept: b.concept,
        amount: parseFloat(b.amount) || 0,
        is_active: b.is_active,
      }));
      fd.set("items", JSON.stringify(items));
      const res = await upsertFeeBreakdownItems(fd);
      if ("error" in res) {
        setFeedback({ type: "error", msg: res.error });
        return;
      }
      setFeedback({ type: "ok", msg: "Desglose guardado" });
      setTimeout(() => window.location.reload(), 600);
    });
  }

  function addBreakdownRow() {
    setBreakdown((curr) => [
      ...curr,
      {
        id: undefined,
        concept: "",
        amount: "",
        is_active: true,
        _key: `new-${Date.now()}-${curr.length}`,
      },
    ]);
  }

  function updateBreakdownRow(idx: number, patch: Partial<BreakdownDraft>) {
    setBreakdown((curr) => curr.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeBreakdownRow(idx: number) {
    setBreakdown((curr) => curr.filter((_, i) => i !== idx));
  }

  function updateTypeAmount(idx: number, amount: string) {
    setTypeAmounts((curr) => curr.map((r, i) => (i === idx ? { ...r, amount } : r)));
  }

  return (
    <div className="space-y-8">
      {feedback && (
        <div
          className={`rounded-lg border p-2.5 text-sm ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* MODO DE COBRANZA */}
      <section className="space-y-4">
        <div>
          <p className="font-meta text-mute mb-2">MODO DE COBRANZA</p>
          <p className="text-[13px] text-marine-deep/80 leading-relaxed">
            Define cómo se calcula la cuota mensual de cada unidad cuando generas cobros.
          </p>
        </div>
        <div className="space-y-2">
          {FEE_MODES.map((m) => (
            <label
              key={m}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                config.fee_mode === m ? "border-primary bg-primary/5" : "hover:border-primary"
              }`}
            >
              <input
                type="radio"
                name="fee_mode"
                value={m}
                checked={config.fee_mode === m}
                disabled={pending}
                onChange={() => setConfig((c) => ({ ...c, fee_mode: m }))}
                className="mt-1 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">{FEE_MODE_LABELS[m]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{FEE_MODE_DESCRIPTIONS[m]}</p>
              </div>
            </label>
          ))}
        </div>

        {config.fee_mode === "by_aliquot" && (
          <div className="space-y-2 rounded-lg bg-cyan/5 border border-cyan/20 p-4">
            <Label htmlFor="fee_base_amount">Total mensual del condo (USD)</Label>
            <Input
              id="fee_base_amount"
              type="number"
              step="0.01"
              min="0"
              value={config.fee_base_amount ?? ""}
              placeholder="5200.00"
              disabled={pending}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  fee_base_amount: e.target.value === "" ? null : parseFloat(e.target.value),
                }))
              }
            />
            <p className="text-[12px] text-mute">
              Se reparte proporcional a la alícuota de cada unidad:{" "}
              <code>base × alícuota ÷ suma de alícuotas</code>. El total cobrado siempre da
              exacto, sumen 100% o no. Cárgalas en{" "}
              <a href="/admin/units/alicuotas" className="text-cyan-ink hover:text-marine-deep">
                Unidades → Alícuotas
              </a>
              .
            </p>
          </div>
        )}

        {config.fee_mode === "by_type" && (
          <div className="space-y-3 rounded-lg bg-cyan/5 border border-cyan/20 p-4">
            <p className="text-[13px] font-semibold text-marine-deep">Monto por tipo de unidad</p>
            {typeAmounts.length === 0 ? (
              <p className="text-[12px] text-mute italic">
                No hay tipos de unidad detectados en tu condo. Agrega unidades primero.
              </p>
            ) : (
              <div className="space-y-2">
                {typeAmounts.map((r, i) => (
                  <div key={r._key} className="grid grid-cols-[1fr_140px] gap-3 items-center">
                    <span className="text-[13px] text-marine-deep">
                      {UNIT_TYPE_LABELS[r.unit_type] ?? r.unit_type}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={r.amount}
                      placeholder="0.00"
                      disabled={pending}
                      onChange={(e) => updateTypeAmount(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {config.fee_mode === "manual" && (
          <p className="text-[12px] text-mute italic">
            Cada vez que generes cuotas, el formulario te pedirá el monto unidad por unidad.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="late_fee_pct">Recargo por mora (%)</Label>
          <Input
            id="late_fee_pct"
            type="number"
            step="0.01"
            min="0"
            max="99.99"
            value={config.late_fee_pct ?? ""}
            placeholder="Sin recargo"
            disabled={pending}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                late_fee_pct: e.target.value === "" ? null : parseFloat(e.target.value),
              }))
            }
          />
          <p className="text-[12px] text-mute">
            Configurable, pero la lógica de aplicación no está activa todavía. Se reserva para una épica futura.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" size="sm" onClick={saveConfig} disabled={pending}>
            {pending ? "Guardando…" : "Guardar configuración"}
          </Button>
        </div>
      </section>

      {/* DESGLOSE DE LA CUOTA */}
      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <p className="font-meta text-mute mb-2">DESGLOSE DE LA CUOTA (visible para residentes)</p>
          <p className="text-[13px] text-marine-deep/80 leading-relaxed">
            Cómo se compone la cuota mensual a ojos del residente. Solo informativo: no altera el cálculo del monto a cobrar.
          </p>
        </div>

        {breakdown.length === 0 ? (
          <p className="text-[13px] text-mute italic">
            Aún no hay desglose. Agrega conceptos para que el residente vea qué cubre su cuota.
          </p>
        ) : (
          <div className="space-y-2">
            {breakdown.map((row, i) => (
              <div
                key={row._key}
                className="grid grid-cols-[1fr_140px_auto_auto] gap-3 items-center"
              >
                <Input
                  value={row.concept}
                  placeholder="Concepto (ej: Vigilancia)"
                  disabled={breakdownPending}
                  onChange={(e) => updateBreakdownRow(i, { concept: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.amount}
                  placeholder="0.00"
                  disabled={breakdownPending}
                  onChange={(e) => updateBreakdownRow(i, { amount: e.target.value })}
                />
                <label className="flex items-center gap-1.5 text-[12px] text-mute cursor-pointer">
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    disabled={breakdownPending}
                    onChange={(e) => updateBreakdownRow(i, { is_active: e.target.checked })}
                    className="h-4 w-4 cursor-pointer"
                  />
                  Activo
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={breakdownPending}
                  onClick={() => removeBreakdownRow(i)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Borrar
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-[13px] text-mute">Suma activa</span>
              <span className="font-display text-[18px] text-marine-deep">
                ${breakdownTotal.toFixed(2)}
              </span>
            </div>
            {breakdownVsBaseDelta !== null && Math.abs(breakdownVsBaseDelta) >= 0.01 && (
              <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                {breakdownVsBaseDelta > 0
                  ? `El desglose suma $${breakdownTotal.toFixed(2)}, $${breakdownVsBaseDelta.toFixed(2)} más que el total mensual ($${baseAmountNumeric.toFixed(2)}).`
                  : `El desglose suma $${breakdownTotal.toFixed(2)}, $${Math.abs(breakdownVsBaseDelta).toFixed(2)} menos que el total mensual ($${baseAmountNumeric.toFixed(2)}).`}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={addBreakdownRow} disabled={breakdownPending}>
            + Agregar concepto
          </Button>
          <Button type="button" size="sm" onClick={saveBreakdown} disabled={breakdownPending}>
            {breakdownPending ? "Guardando…" : "Guardar desglose"}
          </Button>
        </div>
      </section>
    </div>
  );
}
