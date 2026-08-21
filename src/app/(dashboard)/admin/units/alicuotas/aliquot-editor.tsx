"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setUnitAliquots } from "../actions";
import {
  aliquotStatus,
  computeCoverage,
  formatAliquot,
  parseAliquotInput,
  seedEqual,
  seedScaleTo100,
  ALIQUOT_DESKTOP_HINT_UNITS,
  type AliquotRow,
} from "@/lib/units/aliquot";
import { UNIT_TYPE_LABELS } from "@/lib/labels";

export interface UnitForAliquot extends AliquotRow {
  type: string;
  block: string | null;
  floor: number | null;
}

interface Props {
  units: UnitForAliquot[];
  /** Modo de cobranza del condominio, para explicar el impacto real del cambio. */
  feeMode: string;
  /** Monto base mensual, si el condominio cobra por alícuota. */
  feeBaseAmount: number | null;
  currency: string;
  /** Cuotas ya emitidas y sin pagar: cambiar la alícuota NO las recalcula. */
  cuotasPendientes: number;
}

const TONE_CLASS: Record<string, string> = {
  ok: "text-cyan-ink",
  warn: "text-ember-ink",
  danger: "text-destructive",
};

export function AliquotEditor({
  units,
  feeMode,
  feeBaseAmount,
  currency,
  cuotasPendientes,
}: Props) {
  // Borradores como texto: lo que el admin ve es exactamente lo que tecleó,
  // hasta que guarda. Vacío = sin configurar (NULL), que no es lo mismo que 0.
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const u of units) {
      map[u.id] = u.aliquot === null ? "" : String(u.aliquot).replace(".", ",");
    }
    return map;
  });
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const parsed = useMemo(
    () =>
      units.map((u) => {
        const r = parseAliquotInput(drafts[u.id]);
        return {
          unit: u,
          value: r.ok ? r.value : null,
          error: r.ok ? null : r.error,
        };
      }),
    [units, drafts],
  );

  const hayErrores = parsed.some((p) => p.error);
  const cobertura = useMemo(
    () => computeCoverage(parsed.map((p) => ({ aliquot: p.value }))),
    [parsed],
  );
  const estado = useMemo(() => aliquotStatus(cobertura), [cobertura]);

  const sucio = useMemo(
    () =>
      units.some((u) => {
        const original = u.aliquot === null ? "" : String(u.aliquot).replace(".", ",");
        return (drafts[u.id] ?? "") !== original;
      }),
    [units, drafts],
  );

  // Que no se pierda media hora de tipeo por un clic en el menú.
  useEffect(() => {
    if (!sucio) return;
    function aviso(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sucio]);

  const porAlicuota = feeMode === "by_aliquot";
  const base = Number(feeBaseAmount ?? 0);

  /** Lo que pagaría cada unidad con el reparto actual. El preview que convierte
   *  un porcentaje abstracto en la cifra que el vecino va a ver. */
  function cuotaDe(valor: number | null): string | null {
    if (!porAlicuota || base <= 0 || cobertura.sum <= 0 || valor === null) return null;
    return ((base * valor) / cobertura.sum).toFixed(2);
  }

  function aplicarSemilla(map: Map<string, number>, etiqueta: string) {
    if (map.size === 0) return;

    // Pisar 21 números transcritos del documento de condominio sin preguntar es
    // destruir media hora de trabajo con un clic.
    const pisaCargados = units.filter(
      (u) => (drafts[u.id] ?? "").trim() !== "" && map.has(u.id),
    ).length;
    if (pisaCargados > 0) {
      const ok = window.confirm(
        `"${etiqueta}" va a reemplazar ${pisaCargados} valor${pisaCargados !== 1 ? "es" : ""} ` +
          `que ya tienes cargado${pisaCargados !== 1 ? "s" : ""}.

` +
          "Nada se guarda hasta que toques Guardar, y puedes deshacer con «Restaurar lo guardado».",
      );
      if (!ok) return;
    }

    setDrafts((prev) => {
      const next = { ...prev };
      for (const [id, v] of map) next[id] = String(v).replace(".", ",");
      return next;
    });
    setError("");
    setConfirmando(false);
  }

  function restaurarGuardado() {
    const map: Record<string, string> = {};
    for (const u of units) {
      map[u.id] = u.aliquot === null ? "" : String(u.aliquot).replace(".", ",");
    }
    setDrafts(map);
    setError("");
    setConfirmando(false);
  }

  async function guardar() {
    if (hayErrores) {
      setError("Corrige los valores marcados en rojo antes de guardar.");
      return;
    }
    if (estado.needsConfirm && !confirmando) {
      setConfirmando(true);
      return;
    }

    setLoading(true);
    setError("");

    const fd = new FormData();
    fd.set("reason", reason);
    fd.set(
      "items",
      JSON.stringify(parsed.map((p) => ({ id: p.unit.id, value: p.value }))),
    );

    const res = await setUnitAliquots(fd);
    setLoading(false);
    setConfirmando(false);

    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      {/* Totalizador — pegajoso porque es el dato que el admin mira mientras teclea */}
      <div className="sticky top-2 z-20 rounded-2xl bg-card border border-border shadow-[0_10px_30px_-18px_rgb(15,46,90,0.35)] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <p className={`font-meta ${TONE_CLASS[estado.tone]}`}>{estado.label}</p>
            <p className="mt-2 text-[14px] text-mute max-w-xl">{estado.detail}</p>
          </div>
          <p className="font-display text-[32px] leading-none tracking-[-0.02em] text-marine-deep tabular-nums">
            {cobertura.sum.toFixed(2).replace(".", ",")}
            <span className="text-mute text-[20px]">%</span>
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-meta text-mute">
          <span>{cobertura.totalUnits} UNIDADES</span>
          <span>{cobertura.configured} CARGADAS</span>
          {cobertura.unset > 0 && (
            <span className="text-ember-ink">{cobertura.unset} SIN CONFIGURAR</span>
          )}
          {cobertura.atZero > 0 && <span>{cobertura.atZero} EXENTAS (0%)</span>}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              aplicarSemilla(seedEqual(units.map((u) => u.id)), "Repartir en partes iguales")
            }
            disabled={loading}
          >
            Repartir en partes iguales
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              aplicarSemilla(
                seedScaleTo100(parsed.map((p) => ({ ...p.unit, aliquot: p.value }))),
                "Escalar lo cargado a 100%",
              )
            }
            disabled={loading || cobertura.sum <= 0}
          >
            Escalar lo cargado a 100%
          </Button>
          {sucio && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={restaurarGuardado}
              disabled={loading}
            >
              Restaurar lo guardado
            </Button>
          )}
          <span className="self-center font-meta text-mute">
            LLENAN LA HOJA · NO GUARDAN NADA
          </span>
        </div>
      </div>

      {cuotasPendientes > 0 && (
        <div className="rounded-xl border border-ember/40 bg-ember/5 p-4">
          <p className="text-[14px] text-marine-deep">
            Ya hay <strong>{cuotasPendientes} cuota{cuotasPendientes !== 1 ? "s" : ""}</strong>{" "}
            emitida{cuotasPendientes !== 1 ? "s" : ""} y sin pagar, calculada
            {cuotasPendientes !== 1 ? "s" : ""} con las alícuotas anteriores.{" "}
            <span className="text-mute">
              Cambiarlas ahora no las recalcula: el nuevo reparto aplica a las cuotas que emitas
              de acá en adelante.
            </span>
          </p>
        </div>
      )}

      {units.length > ALIQUOT_DESKTOP_HINT_UNITS && (
        <p className="md:hidden font-meta text-mute">
          SON {units.length} UNIDADES · SE HACE MUCHO MÁS CÓMODO DESDE UNA COMPUTADORA
        </p>
      )}

      {/* Filas */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_150px_150px] gap-3 px-5 py-3 border-b border-border bg-cloud/40">
          <span className="font-meta text-mute">UNIDAD</span>
          <span className="font-meta text-mute text-right">ALÍCUOTA %</span>
          <span className="font-meta text-mute text-right">
            {porAlicuota && base > 0 ? `CUOTA ${currency}` : "ESTADO"}
          </span>
        </div>

        <div className="divide-y divide-border">
          {parsed.map(({ unit, value, error: errFila }) => {
            const cuota = cuotaDe(value);
            return (
              <div
                key={unit.id}
                className="grid grid-cols-[1fr_110px] md:grid-cols-[1fr_150px_150px] gap-3 items-center px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[14px] text-marine-deep truncate">
                    {UNIT_TYPE_LABELS[unit.type] ?? unit.type} {unit.unit_number}
                    {unit.block && <span className="text-mute"> · {unit.block}</span>}
                  </p>
                  {errFila && (
                    <p className="mt-0.5 text-[12px] text-destructive">{errFila}</p>
                  )}
                  {/* En móvil la cuota va como línea secundaria, no como columna */}
                  {cuota && (
                    <p className="md:hidden mt-0.5 font-mono text-[12px] text-mute tabular-nums">
                      {currency} {cuota}
                    </p>
                  )}
                </div>

                <div>
                  <label className="sr-only" htmlFor={`aliq-${unit.id}`}>
                    Alícuota de la unidad {unit.unit_number}
                  </label>
                  <Input
                    id={`aliq-${unit.id}`}
                    value={drafts[unit.id] ?? ""}
                    onChange={(e) => {
                      setDrafts((prev) => ({ ...prev, [unit.id]: e.target.value }));
                      if (error) setError("");
                      // Si sigue editando, la confirmación anterior ya no aplica.
                      if (confirmando) setConfirmando(false);
                    }}
                    inputMode="decimal"
                    placeholder="—"
                    aria-invalid={errFila ? true : undefined}
                    className={`h-11 text-right font-mono tabular-nums ${
                      errFila ? "border-destructive" : ""
                    }`}
                  />
                </div>

                <div className="hidden md:block text-right">
                  {cuota ? (
                    <span className="font-mono text-[13px] text-marine-deep tabular-nums">
                      {currency} {cuota}
                    </span>
                  ) : value === null ? (
                    <span className="font-meta text-ember-ink">SIN CONFIGURAR</span>
                  ) : value === 0 ? (
                    <span className="font-meta text-mute">EXENTA</span>
                  ) : (
                    <span className="font-mono text-[13px] text-mute tabular-nums">
                      {formatAliquot(value)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guardado */}
      <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
        <div className="space-y-2">
          <label htmlFor="reason" className="font-meta text-mute">
            POR QUÉ CAMBIAS LAS ALÍCUOTAS
          </label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder="Ej: transcripción del documento de condominio protocolizado"
            className="h-11"
          />
          <p className="text-[12px] text-mute">
            Queda registrado con tu nombre y la fecha. La alícuota decide cuánto paga cada vecino
            y cuánto pesa su voto.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
          >
            {error}
          </p>
        )}

        {confirmando && (
          <p className="rounded-md border border-ember/40 bg-ember/5 px-3 py-2 text-[13px] text-marine-deep">
            Las alícuotas suman{" "}
            <strong>{cobertura.sum.toFixed(2).replace(".", ",")}%</strong>, lejos de 100%. Puedes
            guardarlas igual —el cobro sigue siendo exacto— pero conviene revisarlas contra el
            documento de condominio. Toca de nuevo para confirmar.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={guardar}
            disabled={loading || hayErrores || !sucio || reason.trim().length < 10}
            className="min-w-40"
          >
            {loading
              ? "Guardando…"
              : confirmando
                ? "Sí, guardar igual"
                : "Guardar alícuotas"}
          </Button>
          {/* beforeunload no cubre la navegación client-side de Next: sin esto,
              un clic acá se llevaba los 21 números sin preguntar. */}
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => {
              if (
                sucio &&
                !window.confirm("Tienes cambios sin guardar. ¿Salir y perderlos?")
              ) {
                return;
              }
              window.location.href = "/admin/units";
            }}
          >
            Volver a unidades
          </Button>
        </div>

        {!sucio && (
          <p className="font-meta text-mute">SIN CAMBIOS POR GUARDAR</p>
        )}
        {sucio && reason.trim().length < 10 && (
          <p className="text-[13px] text-mute">
            Escribe el motivo del cambio para poder guardar.
          </p>
        )}
      </div>
    </div>
  );
}
