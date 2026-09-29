"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usd } from "@/lib/format";
import { tabla } from "@/components/contabilidad/ui";
import { procesarApertura, type FilaApertura } from "./actions";

export function Apertura({ hoy }: { hoy: string }) {
  const [fecha, setFecha] = useState(hoy);
  const [texto, setTexto] = useState("");
  const [filas, setFilas] = useState<FilaApertura[] | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, start] = useTransition();

  const ok = filas?.filter((f) => f.estado === "ok") ?? [];
  const errores = filas?.filter((f) => f.estado === "error") ?? [];

  function correr(aplicar: boolean) {
    start(async () => {
      setAviso(null);
      const r = await procesarApertura(texto, fecha, aplicar);
      if ("error" in r) return setAviso({ ok: false, msg: r.error });
      setFilas(r.filas);
      if (aplicar) {
        setAviso({ ok: true, msg: "Saldos de apertura cargados. El saldo a favor ya se aplicó a lo que cada unidad debía." });
        setTimeout(() => window.location.reload(), 900);
      }
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <ol className="list-decimal space-y-1 pl-5 text-[14px] text-mute">
        <li>Elige la fecha de corte: el día hasta el que llega la planilla de la junta.</li>
        <li>
          En Excel, deja cuatro columnas: <strong className="text-marine-deep">Torre, Unidad, Deuda, Saldo a favor</strong> (en dólares).
          Selecciónalas, copia y pega aquí.
        </li>
        <li>Revisa y aplica. Se carga una sola vez por unidad.</li>
      </ol>
      <label className="flex flex-wrap items-center gap-3 text-[14px] text-marine-deep">
        Fecha de corte
        <input type="date" max={hoy} value={fecha} onChange={(e) => { setFecha(e.target.value); setFilas(null); }} className="h-10 rounded-lg border border-border bg-background px-3" />
      </label>
      <textarea
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setFilas(null); }}
        rows={7}
        placeholder={"Torre\tUnidad\tDeuda\tSaldo a favor\nTorre A\t1-1\t340,50\t0\nTorre A\t3-5\t0\t238,84"}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px]"
        aria-label="Planilla de saldos"
      />
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending || !texto.trim()} onClick={() => correr(false)}>
          {pending && !filas ? "Revisando…" : "Revisar"}
        </Button>
        {filas && ok.length > 0 && (
          <Button
            className="bg-ember hover:bg-ember/90"
            disabled={pending}
            onClick={() => {
              if (confirm(`Se cargarán los saldos de ${ok.length} unidades al ${fecha.split("-").reverse().join("/")}. ¿Continuar?`)) correr(true);
            }}
          >
            {pending ? "Cargando…" : `Cargar ${ok.length} unidades`}
          </Button>
        )}
      </div>
      {aviso && <p className={`rounded-lg px-3 py-2 text-[14px] ${aviso.ok ? "bg-emerald-50 text-emerald-800" : "bg-destructive/5 text-destructive"}`}>{aviso.msg}</p>}

      {filas && (
        <div className="space-y-2">
          <p className="text-[13px] text-mute">
            {ok.length} para cargar · deuda {usd(ok.reduce((s, f) => s + f.deuda, 0))} · a favor {usd(ok.reduce((s, f) => s + f.favor, 0))}
            {errores.length ? ` · ${errores.length} con problemas` : ""}
          </p>
          <div className={`${tabla.contenedor} max-h-[26rem] overflow-y-auto`}>
            <table className={tabla.tabla}>
              <thead className={tabla.thead}>
                <tr>
                  <th className={tabla.th}>Fila</th>
                  <th className={tabla.th}>Unidad</th>
                  <th className={tabla.thNum}>Deuda</th>
                  <th className={tabla.thNum}>A favor</th>
                  <th className={tabla.th}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {[...filas].sort((a, b) => (a.estado === "error" ? -1 : 0) - (b.estado === "error" ? -1 : 0)).map((f) => (
                  <tr key={f.linea}>
                    <td className={`${tabla.td} text-mute`}>{f.linea}</td>
                    <td className={tabla.td}>{f.unidad}</td>
                    <td className={tabla.tdNum}>{f.deuda ? usd(f.deuda) : "—"}</td>
                    <td className={tabla.tdNum}>{f.favor ? usd(f.favor) : "—"}</td>
                    <td className={`${tabla.td} ${f.estado === "error" ? "text-destructive" : f.estado === "ok" ? "text-emerald-700" : "text-mute"}`}>
                      {f.estado === "ok" ? "Se carga" : f.detalle}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
