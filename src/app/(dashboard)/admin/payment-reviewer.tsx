"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { usd } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import {
  REJECTION_REASONS,
  MIN_REASON_LENGTH,
  MAX_REASON_LENGTH,
} from "@/lib/rejection-reasons";
import { approvePayment, rejectPayment } from "../pagos/actions";

interface PendingPayment {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  reference: string | null;
  receipt_url: string | null;
  paid_at: string;
  status: string;
  invoices: { description: string; units: { unit_number: string; block: string | null } | null } | null;
}

const OTRO = "__otro__";
const TODAS = "__todas__";

/**
 * Comprobantes por revisar.
 *
 * Antes era una tarjeta por comprobante, con la imagen y dos botones del ancho
 * de la tarjeta: con 15 pendientes eran seis pantallas de scroll, y para 103
 * unidades a fin de mes, inmanejable. Ahora es una lista compacta con filtro por
 * torre, búsqueda por apartamento o referencia, y aprobación en lote.
 */
export function PaymentReviewer({ payments }: { payments: PendingPayment[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string>(REJECTION_REASONS[0]);
  const [motivoLibre, setMotivoLibre] = useState("");
  const [torre, setTorre] = useState<string>(TODAS);
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [lote, setLote] = useState<{ hechos: number; total: number } | null>(null);
  const [verComprobante, setVerComprobante] = useState<string | null>(null);

  const motivoFinal = motivo === OTRO ? motivoLibre.trim() : motivo;

  const torres = useMemo(
    () =>
      [...new Set(payments.map((p) => p.invoices?.units?.block).filter(Boolean) as string[])].sort(),
    [payments],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return payments.filter((p) => {
      const u = p.invoices?.units;
      if (torre !== TODAS && u?.block !== torre) return false;
      if (!q) return true;
      return (
        (u?.unit_number ?? "").toLowerCase().includes(q) ||
        (p.reference ?? "").toLowerCase().includes(q) ||
        (p.invoices?.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [payments, torre, busqueda]);

  const seleccionVisible = visibles.filter((p) => seleccion.has(p.id));
  const todosMarcados = visibles.length > 0 && seleccionVisible.length === visibles.length;
  const totalSeleccion = seleccionVisible.reduce((s, p) => s + Number(p.amount), 0);

  function alternar(id: string) {
    setSeleccion((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function alternarTodos() {
    setSeleccion((prev) => {
      const n = new Set(prev);
      if (todosMarcados) visibles.forEach((p) => n.delete(p.id));
      else visibles.forEach((p) => n.add(p.id));
      return n;
    });
  }

  async function handleApprove(id: string) {
    setLoading(id);
    setError("");
    const res = await approvePayment(id);
    setLoading(null);
    if (res.error) setError(res.error);
    else window.location.reload();
  }

  async function aprobarSeleccion() {
    const ids = seleccionVisible.map((p) => p.id);
    if (ids.length === 0) return;
    setError("");
    setLote({ hechos: 0, total: ids.length });
    const fallos: string[] = [];
    // Uno por uno y no en paralelo: cada aprobación manda su correo, y así un
    // error no deja la mitad del lote en un estado que nadie entiende.
    for (let i = 0; i < ids.length; i++) {
      const res = await approvePayment(ids[i]);
      if (res.error) fallos.push(res.error);
      setLote({ hechos: i + 1, total: ids.length });
    }
    if (fallos.length) {
      setLote(null);
      setError(
        `${ids.length - fallos.length} aprobados; ${fallos.length} no se pudieron aprobar: ${fallos[0]}`,
      );
      return;
    }
    window.location.reload();
  }

  function abrirRechazo(id: string) {
    setRechazando(id);
    setMotivo(REJECTION_REASONS[0]);
    setMotivoLibre("");
    setError("");
  }

  async function confirmarRechazo(id: string) {
    if (motivoFinal.length < MIN_REASON_LENGTH) {
      setError("Elige o escribe el motivo: el residente lo va a ver.");
      return;
    }
    setLoading(id);
    setError("");
    const res = await rejectPayment(id, motivoFinal);
    setLoading(null);
    if (res.error) setError(res.error);
    else window.location.reload();
  }

  if (payments.length === 0) {
    return <p className="py-4 text-center text-[13px] text-mute">No hay comprobantes pendientes. Todo al día.</p>;
  }

  const ocupado = loading !== null || lote !== null;

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {torres.length > 1 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por torre">
            {[TODAS, ...torres].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTorre(t)}
                aria-pressed={torre === t}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  torre === t
                    ? "bg-marine-deep text-frost"
                    : "border border-border text-marine-deep/70 hover:border-marine/40"
                }`}
              >
                {t === TODAS ? "Todas" : t}
              </button>
            ))}
          </div>
        )}
        <label className="sr-only" htmlFor="buscar-comprobante">
          Buscar por apartamento o referencia
        </label>
        <input
          id="buscar-comprobante"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Apto o referencia…"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-cyan"
        />
      </div>

      {/* Barra de lote */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cloud/40 px-3 py-2">
        <label className="flex items-center gap-2 text-[13px] text-marine-deep">
          <input
            type="checkbox"
            checked={todosMarcados}
            onChange={alternarTodos}
            disabled={ocupado}
            className="h-4 w-4"
          />
          {seleccionVisible.length > 0
            ? `${seleccionVisible.length} seleccionado${seleccionVisible.length !== 1 ? "s" : ""} · ${usd(totalSeleccion)}`
            : `Seleccionar los ${visibles.length} visibles`}
        </label>
        <Button
          size="sm"
          onClick={aprobarSeleccion}
          disabled={seleccionVisible.length === 0 || ocupado}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {lote
            ? `Aprobando ${lote.hechos} de ${lote.total}…`
            : `Aprobar${seleccionVisible.length ? ` ${seleccionVisible.length}` : ""}`}
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-[13px] text-destructive"
        >
          {error}
        </p>
      )}

      {visibles.length === 0 && (
        <p className="py-4 text-center text-[13px] text-mute">Ningún comprobante coincide con el filtro.</p>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border">
        {visibles.map((p) => {
          const isLoading = loading === p.id;
          const abierto = rechazando === p.id;
          const u = p.invoices?.units;

          return (
            <li key={p.id} className="p-3 space-y-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={seleccion.has(p.id)}
                  onChange={() => alternar(p.id)}
                  disabled={ocupado}
                  aria-label={`Seleccionar Apto ${u?.unit_number ?? ""} ${u?.block ?? ""}`}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[14px] font-semibold text-marine-deep">
                      Apto {u?.unit_number ?? "?"}
                      {u?.block && <span className="font-normal text-mute"> · {u.block}</span>}
                    </p>
                    <span className="text-[14px] font-bold tabular-nums shrink-0">{usd(Number(p.amount))}</span>
                  </div>
                  <p className="text-[12px] text-mute">
                    {p.invoices?.description ?? "Pago"} · {PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}
                    {p.reference ? ` · Ref ${p.reference}` : " · sin referencia"}
                    {" · "}
                    {new Date(p.paid_at).toLocaleDateString("es-VE", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>

              {verComprobante === p.id && p.receipt_url && (
                <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="h-48 w-full rounded-lg overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.receipt_url}
                      alt={`Comprobante de ${p.invoices?.description ?? "pago"}`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </a>
              )}

              {abierto ? (
                <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 space-y-2.5">
                  <p className="font-meta text-red-700">MOTIVO DEL RECHAZO</p>
                  <p className="text-[12px] text-red-900/80">
                    El residente verá este texto en su pantalla de Pagos para saber qué corregir.
                  </p>
                  <label className="sr-only" htmlFor={`motivo-${p.id}`}>
                    Motivo del rechazo
                  </label>
                  <select
                    id={`motivo-${p.id}`}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                  >
                    {REJECTION_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    <option value={OTRO}>Otro motivo…</option>
                  </select>
                  {motivo === OTRO && (
                    <>
                      <label className="sr-only" htmlFor={`motivo-libre-${p.id}`}>
                        Escribe el motivo
                      </label>
                      <input
                        id={`motivo-libre-${p.id}`}
                        value={motivoLibre}
                        onChange={(e) => setMotivoLibre(e.target.value)}
                        maxLength={MAX_REASON_LENGTH}
                        placeholder="Explícale qué pasó, en una línea"
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                      />
                    </>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setRechazando(null)} disabled={isLoading}>
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() => confirmarRechazo(p.id)}
                      disabled={isLoading || motivoFinal.length < MIN_REASON_LENGTH}
                    >
                      {isLoading ? "Rechazando…" : "Confirmar rechazo"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 pl-7">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(p.id)}
                    disabled={ocupado}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isLoading ? "Aprobando…" : "Aprobar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirRechazo(p.id)}
                    disabled={ocupado}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Rechazar
                  </Button>
                  {p.receipt_url ? (
                    <button
                      type="button"
                      onClick={() => setVerComprobante(verComprobante === p.id ? null : p.id)}
                      className="text-[12px] font-medium text-cyan-ink hover:underline"
                    >
                      {verComprobante === p.id ? "Ocultar comprobante" : "Ver comprobante"}
                    </button>
                  ) : (
                    <span className="text-[12px] text-mute">Sin captura · verifica la referencia</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
