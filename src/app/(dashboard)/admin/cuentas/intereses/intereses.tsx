"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usd } from "@/lib/format";
import { tabla, Vacio } from "@/components/contabilidad/ui";
import { emitirIntereses, guardarTasaMora, previsualizarIntereses } from "../actions";

interface Fila {
  unitId: string;
  etiqueta: string;
  base: number;
  detalle: { concepto: string; pendiente: number; dias: number; interes: number }[];
  interes: number;
  excluida?: string;
}

const campo = "h-10 rounded-lg border border-border bg-background px-3 text-[14px]";

export function Intereses(props: {
  tasaInicial: number | null;
  actaInicial: string;
  desde: string;
  hasta: string;
  vence: string;
  hoy: string;
}) {
  const [tasa, setTasa] = useState(props.tasaInicial?.toString() ?? "3");
  const [acta, setActa] = useState(props.actaInicial);
  const [guardada, setGuardada] = useState(props.tasaInicial);
  const [desde, setDesde] = useState(props.desde);
  const [hasta, setHasta] = useState(props.hasta);
  const [vence, setVence] = useState(props.vence);
  const [excluir, setExcluir] = useState(true);
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, start] = useTransition();

  const aCobrar = (filas ?? []).filter((f) => !f.excluida);
  const total = aCobrar.reduce((s, f) => s + f.interes, 0);

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <p className="font-meta text-mute">TASA DEL CONDOMINIO</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="block text-[13px] font-medium text-marine-deep">Interés anual (%)</span>
            <input value={tasa} onChange={(e) => setTasa(e.target.value)} inputMode="decimal" className={`${campo} w-28`} />
          </label>
          <label className="min-w-[16rem] flex-1 space-y-1">
            <span className="block text-[13px] font-medium text-marine-deep">Acta que la aprueba {Number(tasa) > 3 ? "(obligatoria sobre 3 %)" : "(opcional)"}</span>
            <input value={acta} onChange={(e) => setActa(e.target.value)} placeholder="Ej.: Asamblea del 12/03/2025, punto 4" className={`${campo} w-full`} />
          </label>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const v = tasa.trim() === "" ? null : Number(tasa.replace(",", "."));
                const r = await guardarTasaMora(v, acta);
                if ("error" in r) setAviso({ ok: false, msg: r.error });
                else {
                  setGuardada(v);
                  setAviso({ ok: true, msg: "Tasa guardada." });
                }
              })
            }
          >
            Guardar tasa
          </Button>
        </div>
        <p className="text-[12px] text-mute">
          El 3 % anual es el interés legal (Código Civil, art. 1.746). Una tasa mayor tiene que estar aprobada en asamblea o en el
          documento de condominio. No se cobra interés sobre intereses.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <p className="font-meta text-mute">CALCULAR UN PERÍODO</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="block text-[13px] font-medium text-marine-deep">Desde</span>
            <input type="date" value={desde} max={props.hoy} onChange={(e) => setDesde(e.target.value)} className={campo} />
          </label>
          <label className="space-y-1">
            <span className="block text-[13px] font-medium text-marine-deep">Hasta</span>
            <input type="date" value={hasta} max={props.hoy} onChange={(e) => setHasta(e.target.value)} className={campo} />
          </label>
          <label className="space-y-1">
            <span className="block text-[13px] font-medium text-marine-deep">Vencimiento del recibo</span>
            <input type="date" value={vence} min={props.hoy} onChange={(e) => setVence(e.target.value)} className={campo} />
          </label>
          <label className="flex h-10 items-center gap-2 text-[13px] text-marine-deep">
            <input type="checkbox" checked={excluir} onChange={(e) => setExcluir(e.target.checked)} className="h-4 w-4" />
            No cobrar a quien tiene convenio al día
          </label>
          <Button
            disabled={pending || !guardada}
            onClick={() =>
              start(async () => {
                setAviso(null);
                const r = await previsualizarIntereses({ desde, hasta, excluirConvenioAlDia: excluir });
                if ("error" in r) setAviso({ ok: false, msg: r.error as string });
                else setFilas(r.filas);
              })
            }
          >
            {pending ? "Calculando…" : "Calcular"}
          </Button>
        </div>
        {!guardada && <p className="text-[13px] text-amber-700">Guarda primero la tasa del condominio.</p>}
      </section>

      {aviso && (
        <p className={`rounded-lg px-3 py-2 text-[14px] ${aviso.ok ? "bg-emerald-50 text-emerald-800" : "bg-destructive/5 text-destructive"}`}>{aviso.msg}</p>
      )}

      {filas &&
        (filas.length === 0 ? (
          <Vacio>No hay saldos vencidos en ese período.</Vacio>
        ) : (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[14px] text-marine-deep">
                <strong>{aCobrar.length}</strong> unidades · total <strong>{usd(total)}</strong> a {guardada} % anual
              </p>
              <Button
                disabled={pending || aCobrar.length === 0}
                onClick={() => {
                  if (!confirm(`Se emitirán ${aCobrar.length} recibos de intereses por ${usd(total)}. ¿Continuar?`)) return;
                  start(async () => {
                    const r = await emitirIntereses({ desde, hasta, vence, excluirConvenioAlDia: excluir });
                    if ("error" in r) setAviso({ ok: false, msg: r.error });
                    else {
                      setAviso({ ok: true, msg: r.mensaje ?? "Recibos emitidos." });
                      setFilas(null);
                    }
                  });
                }}
              >
                Emitir recibos de intereses
              </Button>
            </div>
            <div className={tabla.contenedor}>
              <table className={tabla.tabla}>
                <thead className={tabla.thead}>
                  <tr>
                    <th className={tabla.th}>Unidad</th>
                    <th className={tabla.thNum}>Saldo vencido</th>
                    <th className={tabla.thNum}>Interés</th>
                    <th className={tabla.th} />
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <FilaInteres key={f.unitId} f={f} abierta={abierta === f.unitId} alternar={() => setAbierta(abierta === f.unitId ? null : f.unitId)} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
    </div>
  );
}

function FilaInteres({ f, abierta, alternar }: { f: Fila; abierta: boolean; alternar: () => void }) {
  return (
    <>
      <tr className={f.excluida ? "text-mute" : ""}>
        <td className={tabla.td}>
          {f.etiqueta}
          {f.excluida && <span className="block text-[11px]">No se cobra: {f.excluida}</span>}
        </td>
        <td className={tabla.tdNum}>{usd(f.base)}</td>
        <td className={`${tabla.tdNum} font-semibold ${f.excluida ? "line-through" : "text-marine-deep"}`}>{usd(f.interes)}</td>
        <td className={`${tabla.td} text-right`}>
          <button type="button" onClick={alternar} className="text-[12px] text-cyan-ink hover:underline">
            {abierta ? "Ocultar" : "Detalle"}
          </button>
        </td>
      </tr>
      {abierta && (
        <tr>
          <td colSpan={4} className="border-t border-border bg-frost/50 px-3 py-2">
            <ul className="space-y-1 text-[12px] text-mute">
              {f.detalle.map((d, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2">
                  <span>{d.concepto}</span>
                  <span className="tabular-nums">
                    {usd(d.pendiente)} × {d.dias} días = {usd(d.interes)}
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
