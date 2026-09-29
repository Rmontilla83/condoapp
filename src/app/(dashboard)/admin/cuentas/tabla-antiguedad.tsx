"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usd } from "@/lib/format";
import { tabla, Vacio } from "@/components/contabilidad/ui";

type Tramo = "corriente" | "d30" | "d60" | "d90" | "d90mas";
interface Fila {
  unitId: string;
  etiqueta: string;
  torre: string;
  propietario: string;
  tramos: Record<Tramo, number>;
  total: number;
  vencido: number;
  diasMayor: number;
  saldoAFavor: number;
  convenio: { alDia: boolean; atraso: number } | null;
}

const COLUMNAS: { clave: Tramo; texto: string }[] = [
  { clave: "corriente", texto: "Por vencer" },
  { clave: "d30", texto: "1–30" },
  { clave: "d60", texto: "31–60" },
  { clave: "d90", texto: "61–90" },
  { clave: "d90mas", texto: "+90" },
];

const monto = (n: number) => (n > 0 ? usd(n) : <span className="text-mute/50">—</span>);

export function TablaAntiguedad({ filas, fecha }: { filas: Fila[]; fecha: string }) {
  const [torre, setTorre] = useState("");
  const [soloDeuda, setSoloDeuda] = useState(true);
  const [busca, setBusca] = useState("");
  const [orden, setOrden] = useState<"unidad" | "deuda">("deuda");

  const torres = useMemo(() => [...new Set(filas.map((f) => f.torre).filter(Boolean))], [filas]);
  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const v = filas.filter(
      (f) =>
        (!torre || f.torre === torre) &&
        (!soloDeuda || f.total > 0) &&
        (!q || f.etiqueta.toLowerCase().includes(q) || f.propietario.toLowerCase().includes(q)),
    );
    return orden === "deuda" ? [...v].sort((a, b) => b.vencido - a.vencido || b.total - a.total) : v;
  }, [filas, torre, soloDeuda, busca, orden]);

  const suma = (k: Tramo) => visibles.reduce((s, f) => s + f.tramos[k], 0);
  const total = visibles.reduce((s, f) => s + f.total, 0);

  function exportar() {
    const enc = ["Unidad", "Propietario", ...COLUMNAS.map((c) => c.texto), "Total", "Saldo a favor", "Convenio"];
    const lineas = visibles.map((f) =>
      [
        f.etiqueta,
        f.propietario,
        ...COLUMNAS.map((c) => f.tramos[c.clave].toFixed(2).replace(".", ",")),
        f.total.toFixed(2).replace(".", ","),
        f.saldoAFavor.toFixed(2).replace(".", ","),
        f.convenio ? (f.convenio.alDia ? "Al día" : "Atrasado") : "",
      ]
        .map((v) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
        .join(";"),
    );
    const csv = `﻿${[enc.join(";"), ...lineas].join("\r\n")}\r\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `antiguedad-de-saldos-${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" data-print-hide>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar unidad o propietario"
          className="h-9 min-w-[14rem] flex-1 rounded-lg border border-border bg-background px-3 text-[14px]"
          aria-label="Buscar"
        />
        <select value={torre} onChange={(e) => setTorre(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-[13px]" aria-label="Torre">
          <option value="">Todas las torres</option>
          {torres.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={orden} onChange={(e) => setOrden(e.target.value as "unidad" | "deuda")} className="h-9 rounded-lg border border-border bg-background px-2 text-[13px]" aria-label="Orden">
          <option value="deuda">Mayor atraso primero</option>
          <option value="unidad">Por unidad</option>
        </select>
        <label className="flex items-center gap-2 text-[13px] text-marine-deep">
          <input type="checkbox" checked={soloDeuda} onChange={(e) => setSoloDeuda(e.target.checked)} className="h-4 w-4" />
          Solo con saldo
        </label>
        <button type="button" onClick={exportar} className="ml-auto h-9 rounded-lg border border-border px-3 text-[13px] font-medium text-marine-deep hover:bg-frost">
          Exportar a Excel
        </button>
      </div>

      {visibles.length === 0 ? (
        <Vacio>{soloDeuda ? "Ninguna unidad tiene saldo pendiente." : "No hay unidades con ese filtro."}</Vacio>
      ) : (
        <div className={tabla.contenedor}>
          <table className={tabla.tabla}>
            <thead className={tabla.thead}>
              <tr>
                <th className={tabla.th}>Unidad</th>
                {COLUMNAS.map((c) => (
                  <th key={c.clave} className={tabla.thNum}>
                    {c.texto}
                  </th>
                ))}
                <th className={tabla.thNum}>Total</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.unitId} className="hover:bg-frost/50">
                  <td className={tabla.td}>
                    <Link href={`/admin/cuentas/${f.unitId}`} className="font-medium text-marine-deep hover:underline">
                      {f.etiqueta}
                    </Link>
                    <span className="block max-w-[16rem] truncate text-[12px] text-mute">{f.propietario || "Sin propietario"}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {f.convenio && (
                        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${f.convenio.alDia ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
                          {f.convenio.alDia ? "Convenio al día" : `Convenio atrasado ${usd(f.convenio.atraso)}`}
                        </span>
                      )}
                      {f.saldoAFavor > 0 && <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[10.5px] font-medium text-cyan-ink">A favor {usd(f.saldoAFavor)}</span>}
                    </span>
                  </td>
                  {COLUMNAS.map((c, i) => (
                    <td key={c.clave} className={`${tabla.tdNum} ${i >= 3 && f.tramos[c.clave] > 0 ? "text-destructive" : ""}`}>
                      {monto(f.tramos[c.clave])}
                    </td>
                  ))}
                  <td className={`${tabla.tdNum} font-semibold text-marine-deep`}>{monto(f.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={tabla.pie}>
                <td className="px-3 py-2.5">
                  {visibles.length} unidad{visibles.length !== 1 ? "es" : ""}
                </td>
                {COLUMNAS.map((c) => (
                  <td key={c.clave} className="px-3 py-2.5 text-right tabular-nums">
                    {usd(suma(c.clave))}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right tabular-nums">{usd(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
