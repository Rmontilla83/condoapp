"use client";

import { useEffect, useRef, useState } from "react";

type Turno = { role: "user" | "assistant"; content: string };

const SUGERENCIAS = [
  "¿Cuánto debo este mes?",
  "¿Cómo pago?",
  "¿Está libre el caney el sábado?",
  "¿Tengo saldo a favor?",
  "¿Cuál es el teléfono de la administración?",
];

// El servidor acepta hasta 20 turnos; se mandan los últimos 19 más la pregunta
// nueva, empezando siempre por un turno del residente.
function recortar(historial: Turno[]): Turno[] {
  let h = historial.slice(-19);
  while (h.length && h[0].role !== "user") h = h.slice(1);
  return h;
}

export function Chat({
  primerNombre,
  modo,
  preguntaInicial,
}: {
  primerNombre: string;
  modo: "ia" | "demo";
  /** Viene de las sugerencias del inicio (/conserje?q=...): se pregunta sola. */
  preguntaInicial?: string;
}) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);
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
      const data = (await r.json().catch(() => ({}))) as { respuesta?: string; error?: string };
      if (!r.ok || !data.respuesta) {
        // Se quita la pregunta que no tuvo respuesta: dejarla rompería la
        // alternancia de turnos en el próximo envío.
        setTurnos(turnos);
        setTexto(limpia);
        setError(data.error ?? "El conserje no pudo responder. Intenta de nuevo.");
        return;
      }
      setTurnos([...conPregunta, { role: "assistant", content: data.respuesta }]);
    } catch {
      setTurnos(turnos);
      setTexto(limpia);
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setPensando(false);
    }
  }

  return (
    <div className="rounded-2xl bg-card border border-border flex flex-col h-[calc(100dvh-19rem)] min-h-[22rem] md:h-auto md:min-h-[60vh] md:max-h-[75vh]">
      {modo === "demo" && (
        <p className="border-b border-border px-4 py-2 text-[12px] text-mute">
          <span className="font-meta text-ember mr-2">MODO DEMO</span>
          Responde con tus datos reales, pero entiende preguntas sencillas. La versión con IA
          conversa con libertad.
        </p>
      )}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4" aria-live="polite">
        {turnos.length === 0 && (
          <div className="space-y-4">
            <p className="text-[15px] text-marine-deep">
              Hola{primerNombre ? `, ${primerNombre}` : ""}. ¿En qué te ayudo?
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.map((s) => (
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
          <div key={i} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
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
        ))}

        {pensando && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-[15px] text-mute">
              Consultando…
            </div>
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
        <label htmlFor="pregunta-conserje" className="sr-only">
          Tu pregunta
        </label>
        <input
          id="pregunta-conserje"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={2000}
          placeholder="Escribe tu pregunta…"
          disabled={pensando}
          className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] focus-visible:outline-2 focus-visible:outline-cyan disabled:opacity-60"
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
