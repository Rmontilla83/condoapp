"use client";

import { useMemo, useState, useTransition } from "react";
import { planillaCsv } from "@/lib/contactos";
import { enlaceWhatsApp } from "@/lib/servicios";
import { invitarPropietarios, procesarPlanilla, type ResultadoFila } from "./actions";

interface Propietario {
  unitId: string;
  torre: string;
  unidad: string;
  profileId: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  entro: boolean;
  invitadoEl: string | null;
}

type Filtro = "todos" | "sin_correo" | "sin_invitar" | "invitados" | "entraron";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "sin_correo", label: "Sin correo" },
  { id: "sin_invitar", label: "Por invitar" },
  { id: "invitados", label: "Invitados" },
  { id: "entraron", label: "Ya entraron" },
];

function estadoDe(p: Propietario): Exclude<Filtro, "todos"> {
  if (p.entro) return "entraron";
  if (!p.correo) return "sin_correo";
  return p.invitadoEl ? "invitados" : "sin_invitar";
}

const ETIQUETA_ESTADO: Record<Exclude<Filtro, "todos">, { texto: string; clase: string }> = {
  entraron: { texto: "Ya entró", clase: "bg-emerald-50 text-emerald-800" },
  invitados: { texto: "Invitado", clase: "bg-cyan/10 text-cyan-ink" },
  sin_invitar: { texto: "Por invitar", clase: "bg-ember/10 text-ember-ink" },
  sin_correo: { texto: "Sin correo", clase: "bg-marine-deep/5 text-mute" },
};

export function Contactos({ propietarios, condominio }: { propietarios: Propietario[]; condominio: string }) {
  const [texto, setTexto] = useState("");
  const [revision, setRevision] = useState<ResultadoFila[] | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; msg: string } | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [pending, start] = useTransition();

  const conteo = useMemo(() => {
    const c = { todos: propietarios.length, sin_correo: 0, sin_invitar: 0, invitados: 0, entraron: 0 };
    for (const p of propietarios) c[estadoDe(p)]++;
    return c;
  }, [propietarios]);
  const conTelefono = propietarios.filter((p) => p.telefono).length;
  const visibles = propietarios.filter((p) => filtro === "todos" || estadoDe(p) === filtro);
  const porAplicar = revision?.filter((r) => r.estado === "cambia").length ?? 0;
  const conError = revision?.filter((r) => r.estado === "error").length ?? 0;

  function descargar() {
    const csv = planillaCsv(
      propietarios.map((p) => ({ torre: p.torre, unidad: p.unidad, nombre: p.nombre, correo: p.correo, telefono: p.telefono ?? "" })),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `contactos-${condominio.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function revisar(aplicar: boolean) {
    start(async () => {
      setAviso(null);
      const r = await procesarPlanilla(texto, aplicar);
      if ("error" in r) {
        setAviso({ ok: false, msg: r.error });
        return;
      }
      if (aplicar) {
        const hechos = r.filas.filter((f) => f.estado === "cambia").length;
        setAviso({ ok: true, msg: `Listo: ${hechos} propietario${hechos !== 1 ? "s" : ""} actualizado${hechos !== 1 ? "s" : ""}. No se envió ningún correo.` });
        setTimeout(() => window.location.reload(), 1200);
      }
      setRevision(r.filas);
    });
  }

  function invitar(ids?: string[]) {
    start(async () => {
      setAviso(null);
      const r = await invitarPropietarios(ids);
      if ("error" in r) setAviso({ ok: false, msg: r.error });
      else {
        setAviso({
          ok: true,
          msg: r.enviados === 0 ? "No había a quién invitar." : `Invitación enviada a ${r.enviados} propietario${r.enviados !== 1 ? "s" : ""}.`,
        });
        if (r.enviados > 0) setTimeout(() => window.location.reload(), 1200);
      }
    });
  }

  function mensajeWhatsApp(p: Propietario) {
    const nombre = p.nombre.split(" ")[0];
    return (
      `Hola${nombre ? ` ${nombre}` : ""}, te escribe la administración de ${condominio}. ` +
      `Ya estamos usando Atryum: ahí ves tus cuotas, reportas pagos, reservas áreas y registras visitas. ` +
      `Entra en https://portal.atryum.net/login ${p.correo ? `con tu correo ${p.correo}` : "con tu correo"} y te llega un código de 6 dígitos.`
    );
  }

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Propietarios", conteo.todos],
          ["Con correo", conteo.todos - conteo.sin_correo],
          ["Con teléfono", conTelefono],
          ["Ya entraron", conteo.entraron],
        ].map(([label, n]) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
            <dt className="text-[12px] text-mute">{label}</dt>
            <dd className="mt-1 font-display text-[24px] tabular-nums text-marine-deep">{n}</dd>
          </div>
        ))}
      </dl>

      {aviso && (
        <p className={`rounded-lg px-3 py-2 text-[14px] ${aviso.ok ? "bg-emerald-50 text-emerald-800" : "bg-destructive/5 text-destructive"}`} role="status">
          {aviso.msg}
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div>
          <h2 className="font-display text-[20px] text-marine-deep">Cargar la planilla de la junta</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] text-mute">
            <li>
              Descarga la planilla con las unidades y los nombres que ya están cargados, y pásasela a la junta.{" "}
              <button type="button" onClick={descargar} className="font-medium text-cyan-ink underline underline-offset-2">
                Descargar planilla
              </button>
            </li>
            <li>Cuando la devuelvan con correos y teléfonos, ábrela en Excel, selecciona todo, copia y pégalo aquí abajo.</li>
            <li>Revisa lo que va a cambiar y aplica. Nadie recibe nada en este paso.</li>
          </ol>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-marine-deep hover:bg-frost">
            Abrir archivo CSV
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (/\.xlsx?$/i.test(f.name)) {
                  setAviso({ ok: false, msg: "Ese es un archivo de Excel. Guárdalo como CSV, o copia las celdas y pégalas aquí." });
                  return;
                }
                setTexto(await f.text());
                setRevision(null);
              }}
            />
          </label>
          <span className="text-[12px] text-mute">o pega las celdas copiadas de Excel:</span>
        </div>
        <textarea
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setRevision(null);
          }}
          rows={6}
          placeholder={"Torre\tUnidad\tPropietario\tCorreo\tTeléfono\nTorre A\t1-1\tMaría Pérez\tmaria@gmail.com\t0414-1234567"}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] focus-visible:outline-2 focus-visible:outline-cyan"
          aria-label="Planilla de contactos"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !texto.trim()}
            onClick={() => revisar(false)}
            className="rounded-lg bg-marine-deep px-4 py-2 text-sm font-medium text-frost disabled:opacity-50"
          >
            {pending && !revision ? "Revisando…" : "Revisar cambios"}
          </button>
          {revision && porAplicar > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => revisar(true)}
              className="rounded-lg bg-ember px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Aplicando…" : `Aplicar ${porAplicar} cambio${porAplicar !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>

        {revision && (
          <div className="space-y-2">
            <p className="text-[13px] text-mute">
              {revision.length} filas · {porAplicar} con cambios · {revision.length - porAplicar - conError} sin cambios · {conError} con
              problemas
            </p>
            <div className="max-h-[26rem] overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-[36rem] text-left text-[13px]">
                <thead className="sticky top-0 bg-frost text-[12px] text-mute">
                  <tr>
                    <th className="px-3 py-2 font-medium">Fila</th>
                    <th className="px-3 py-2 font-medium">Unidad</th>
                    <th className="px-3 py-2 font-medium">Propietario</th>
                    <th className="px-3 py-2 font-medium">Qué pasa</th>
                  </tr>
                </thead>
                <tbody>
                  {[...revision]
                    .sort((a, b) => ({ error: 0, cambia: 1, igual: 2 })[a.estado] - ({ error: 0, cambia: 1, igual: 2 })[b.estado])
                    .map((r) => (
                      <tr key={r.linea} className="border-t border-border align-top">
                        <td className="px-3 py-2 tabular-nums text-mute">{r.linea}</td>
                        <td className="px-3 py-2 text-marine-deep">{r.unidad}</td>
                        <td className="px-3 py-2">{r.propietario}</td>
                        <td className="px-3 py-2">
                          {r.cambios.map((c) => (
                            <span key={c} className="block text-marine-deep">
                              {c}
                            </span>
                          ))}
                          {r.detalle && <span className="block text-destructive">{r.detalle}</span>}
                          {r.estado === "igual" && !r.detalle && <span className="text-mute">Sin cambios</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-[20px] text-marine-deep">Invitar a entrar</h2>
            <p className="mt-1 max-w-xl text-[14px] text-mute">
              La invitación les explica cómo entrar con su correo. También puedes mandarla por WhatsApp desde tu teléfono.
            </p>
          </div>
          <button
            type="button"
            disabled={pending || conteo.sin_invitar === 0}
            onClick={() => {
              if (confirm(`Se enviará la invitación por correo a ${conteo.sin_invitar} propietario(s). ¿Continuar?`)) invitar();
            }}
            className="rounded-lg bg-marine-deep px-4 py-2 text-sm font-medium text-frost disabled:opacity-50"
          >
            Invitar a {conteo.sin_invitar} por correo
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`rounded-full px-3 py-1 text-[12px] ${filtro === f.id ? "bg-marine-deep text-frost" : "border border-border text-marine-deep/70"}`}
            >
              {f.label} · {conteo[f.id]}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {visibles.map((p) => {
            const estado = estadoDe(p);
            const wa = enlaceWhatsApp(p.telefono);
            return (
              <li key={`${p.unitId}-${p.profileId}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-marine-deep">
                    {p.torre ? `${p.torre} · ` : ""}
                    {p.unidad} <span className="font-normal text-mute">· {p.nombre || "Sin nombre"}</span>
                  </p>
                  <p className="truncate text-[12px] text-mute">
                    {p.correo || "Sin correo"} · {p.telefono ?? "Sin teléfono"}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] ${ETIQUETA_ESTADO[estado].clase}`}>
                  {ETIQUETA_ESTADO[estado].texto}
                  {estado === "invitados" && p.invitadoEl
                    ? ` el ${new Date(p.invitadoEl).toLocaleDateString("es-VE", { day: "numeric", month: "short" })}`
                    : ""}
                </span>
                {!p.entro && (
                  <div className="flex gap-2">
                    {wa && (
                      <a
                        href={`${wa}?text=${encodeURIComponent(mensajeWhatsApp(p))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700"
                      >
                        WhatsApp
                      </a>
                    )}
                    {p.correo && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => invitar([p.profileId])}
                        className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-marine-deep disabled:opacity-50"
                      >
                        {p.invitadoEl ? "Reenviar" : "Invitar"}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {visibles.length === 0 && <li className="px-4 py-6 text-center text-[14px] text-mute">Nadie en este grupo.</li>}
        </ul>
      </section>
    </div>
  );
}
