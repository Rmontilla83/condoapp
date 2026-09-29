"use client";

import { useEffect, useRef, useState } from "react";
import { CaraConserje, NOMBRE_CONSERJE } from "@/components/conserje/cara";
import type { PropuestaAveria } from "@/lib/conserje/averia";
import { ReporteAveria } from "./reporte-averia";

type Turno = { role: "user" | "assistant"; content: string; accion?: PropuestaAveria | null };

const SUGERENCIAS = [
  "¿Cuánto debo este mes?",
  "¿Cómo pago?",
  "¿Qué áreas puedo reservar?",
  "Se me dañó el aire",
  "Hay una fuga en el pasillo",
];

// El servidor acepta hasta 20 turnos; se mandan los últimos 19 más la pregunta
// nueva, empezando siempre por un turno del residente. Solo texto: la propuesta
// de avería es de la UI, no de la conversación.
function recortar(historial: Turno[]) {
  let h = historial.slice(-19);
  while (h.length && h[0].role !== "user") h = h.slice(1);
  return h.map(({ role, content }) => ({ role, content }));
}

export function Chat({
  primerNombre,
  modo,
  preguntaInicial,
  variante = "pagina",
  condominio,
  sugerencias = SUGERENCIAS,
}: {
  primerNombre: string;
  modo: "ia" | "demo";
  /** Viene de las sugerencias del inicio (/conserje?q=...): se pregunta sola. */
  preguntaInicial?: string;
  /** "flotante": dentro del panel que se abre desde cualquier pantalla. */
  variante?: "pagina" | "flotante";
  condominio?: string;
  sugerencias?: string[];
}) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const inicialEnviada = useRef(false);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turnos, pensando]);

  useEffect(() => {
    // El ref evita el doble envío del modo estricto de React en desarrollo.
    if (preguntaInicial && !inicialEnviada.current) {
      inicialEnviada.current = true;
      void enviar(preguntaInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntaInicial]);

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || pensando) return;
    setError(null);
    const conPregunta: Turno[] = [...turnos, { role: "user", content: limpia.slice(0, 2000) }];
    setTurnos(conPregunta);
    setTexto("");
    setPensando(true);
    try {
      const r = await fetch("/api/conserje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: recortar(conPregunta) }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        respuesta?: string;
        error?: string;
        accion?: PropuestaAveria | null;
      };
      if (!r.ok || !data.respuesta) {
        // Se quita la pregunta que no tuvo respuesta: dejarla rompería la
        // alternancia de turnos en el próximo envío.
        setTurnos(turnos);
        setTexto(limpia);
        setError(data.error ?? "El conserje no pudo responder. Intenta de nuevo.");
        return;
      }
      setTurnos([...conPregunta, { role: "assistant", content: data.respuesta, accion: data.accion ?? null }]);
    } catch {
      setTurnos(turnos);
      setTexto(limpia);
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setPensando(false);
      if (variante === "flotante") entrada.current?.focus();
    }
  }

  function reporteEnviado(indice: number, titulo: string) {
    setTurnos((prev) => {
      const copia = prev.map((t, i) => (i === indice ? { ...t, accion: null } : t));
      // Turno de confirmación del lado del conserje: mantiene la alternancia
      // si el vecino sigue escribiendo.
      if (copia[copia.length - 1]?.role === "assistant") {
        const ultimo = copia[copia.length - 1];
        copia[copia.length - 1] = {
          ...ultimo,
          content: `${ultimo.content}\n\nListo: reporté «${titulo}» a la administración. Puedes seguirlo en Mantenimiento.`,
        };
      }
      return copia;
    });
  }

  const flotante = variante === "flotante";

  return (
    <div
      className={
        flotante
          ? "flex h-full flex-col bg-card"
          : "rounded-2xl bg-card border border-border flex flex-col h-[calc(100dvh-19rem)] min-h-[22rem] md:h-auto md:min-h-[60vh] md:max-h-[75vh]"
      }
    >
      {modo === "demo" && !flotante && (
        <p className="border-b border-border px-4 py-2 text-[12px] text-mute">
          <span className="font-meta text-ember mr-2">MODO DEMO</span>
          Responde con tus datos reales, pero entiende preguntas sencillas. La versión con IA
          conversa con libertad.
        </p>
      )}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-5 space-y-4" aria-live="polite">
        {turnos.length === 0 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CaraConserje tam={44} className="shrink-0" />
              <div className="rounded-2xl rounded-tl-md bg-muted px-4 py-2.5 text-[15px] leading-relaxed text-marine-deep">
                Hola{primerNombre ? `, ${primerNombre}` : ""}. Soy {NOMBRE_CONSERJE}, el conserje
                {condominio ? ` de ${condominio}` : ""}. Pregúntame lo que necesites del edificio, o cuéntame
                si algo se dañó y lo reporto por ti.
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-14">
              {sugerencias.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="rounded-full border border-border px-3.5 py-1.5 text-[13px] text-marine-deep hover:border-cyan hover:text-cyan-ink transition focus-visible:outline-2 focus-visible:outline-cyan"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turnos.map((t, i) => (
          <div key={i} className="space-y-2">
            <div className={t.role === "user" ? "flex justify-end" : "flex items-end justify-start gap-2"}>
              {t.role === "assistant" && <CaraConserje tam={28} animada={false} className="mb-0.5 shrink-0" />}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                  t.role === "user"
                    ? "bg-marine-deep text-frost rounded-br-md"
                    : "bg-muted text-marine-deep rounded-bl-md"
                }`}
              >
                {t.content}
              </div>
            </div>
            {t.role === "assistant" && t.accion && (
              <div className="pl-9">
                <ReporteAveria propuesta={t.accion} alEnviar={(titulo) => reporteEnviado(i, titulo)} />
              </div>
            )}
          </div>
        ))}

        {pensando && (
          <div className="flex items-end gap-2">
            <CaraConserje tam={28} className="mb-0.5 shrink-0" />
            <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-[15px] text-mute">Consultando…</div>
          </div>
        )}
        <div ref={fin} />
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="border-t border-border p-3 flex gap-2"
      >
        <label htmlFor={`pregunta-conserje-${variante}`} className="sr-only">
          Tu pregunta
        </label>
        <input
          ref={entrada}
          id={`pregunta-conserje-${variante}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={2000}
          placeholder={`Escríbele a ${NOMBRE_CONSERJE}…`}
          disabled={pensando}
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-[16px] md:text-[15px] focus-visible:outline-2 focus-visible:outline-cyan disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pensando || !texto.trim()}
          className="rounded-xl bg-marine-deep text-frost px-4 py-2.5 text-[15px] font-medium disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-cyan"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
