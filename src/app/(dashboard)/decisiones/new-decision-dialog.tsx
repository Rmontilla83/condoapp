"use client";

import { useState } from "react";
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
import { createDecision } from "./actions";
import type { DecisionKind } from "@/types/database";

interface QuestionDraft {
  id: string;
  question: string;
  options: string[];
}

function blankQuestion(): QuestionDraft {
  return { id: crypto.randomUUID(), question: "", options: ["", ""] };
}

type Step = "kind" | "info" | "questions" | "config";

export function NewDecisionDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("kind");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [kind, setKind] = useState<DecisionKind>("quick_poll");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([blankQuestion()]);
  const [weighted, setWeighted] = useState(false);
  const [quorumPct, setQuorumPct] = useState<string>("50");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [closesAt, setClosesAt] = useState<string>("");

  function reset() {
    setStep("kind");
    setKind("quick_poll");
    setTitle("");
    setDescription("");
    setQuestions([blankQuestion()]);
    setWeighted(false);
    setQuorumPct("50");
    setScheduledAt("");
    setClosesAt("");
    setError("");
    setLoading(false);
  }

  function nextStep() {
    setError("");
    if (step === "kind") return setStep("info");
    if (step === "info") {
      if (!title.trim()) {
        setError("Título requerido");
        return;
      }
      return setStep("questions");
    }
    if (step === "questions") {
      // Validar
      if (kind === "quick_poll" && questions.length !== 1) {
        setError("Una encuesta rápida tiene exactamente 1 pregunta");
        return;
      }
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question.trim()) {
          setError(`Pregunta ${i + 1}: texto requerido`);
          return;
        }
        const trimmed = q.options.map((o) => o.trim());
        const emptyIdx = trimmed.findIndex((o) => !o);
        if (emptyIdx !== -1) {
          setError(
            `Pregunta ${i + 1}: la opción ${emptyIdx + 1} está vacía. Complétala o quítala antes de continuar.`,
          );
          return;
        }
        if (trimmed.length < 2) {
          setError(`Pregunta ${i + 1}: necesita al menos 2 opciones`);
          return;
        }
        const hasDupe = trimmed.some((o, idx) => trimmed.indexOf(o) !== idx);
        if (hasDupe) {
          setError(`Pregunta ${i + 1}: hay opciones repetidas.`);
          return;
        }
      }
      return setStep("config");
    }
  }

  function prevStep() {
    setError("");
    if (step === "config") return setStep("questions");
    if (step === "questions") return setStep("info");
    if (step === "info") return setStep("kind");
  }

  function setKindAndAdjust(newKind: DecisionKind) {
    setKind(newKind);
    if (newKind === "quick_poll" && questions.length > 1) {
      setQuestions([questions[0]]);
    }
  }

  function updateQuestion(idx: number, patch: Partial<QuestionDraft>) {
    setQuestions((curr) => curr.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function updateOption(qIdx: number, oIdx: number, value: string) {
    setQuestions((curr) =>
      curr.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) } : q,
      ),
    );
  }

  function addOption(qIdx: number) {
    setQuestions((curr) =>
      curr.map((q, i) => (i === qIdx ? { ...q, options: [...q.options, ""] } : q)),
    );
  }

  function removeOption(qIdx: number, oIdx: number) {
    setQuestions((curr) =>
      curr.map((q, i) =>
        i === qIdx && q.options.length > 2
          ? { ...q, options: q.options.filter((_, j) => j !== oIdx) }
          : q,
      ),
    );
  }

  function addQuestion() {
    if (kind !== "formal_assembly") return;
    setQuestions((curr) => [...curr, blankQuestion()]);
  }

  function removeQuestion(idx: number) {
    if (questions.length === 1) return;
    setQuestions((curr) => curr.filter((_, i) => i !== idx));
  }

  async function submit() {
    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("title", title);
    fd.set("description", description);
    fd.set(
      "questions",
      JSON.stringify(
        questions.map((q) => ({
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
        })),
      ),
    );
    fd.set("weighted_by_aliquot", weighted ? "true" : "false");
    if (kind === "formal_assembly") fd.set("quorum_pct", quorumPct);
    if (scheduledAt) fd.set("scheduled_at", new Date(scheduledAt).toISOString());
    if (closesAt) fd.set("closes_at", new Date(closesAt).toISOString());

    const res = await createDecision(fd);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    setOpen(false);
    setTimeout(() => {
      reset();
      window.location.reload();
    }, 200);
  }

  const closesBeforeScheduled =
    kind === "formal_assembly" &&
    scheduledAt &&
    closesAt &&
    new Date(closesAt) < new Date(scheduledAt);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTimeout(() => reset(), 200);
      }}
    >
      <DialogTrigger render={<Button />}>
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nueva decisión
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva decisión</DialogTitle>
          <DialogDescription>
            Paso {stepIndex(step)} de 4 · {stepLabel(step)}
          </DialogDescription>
        </DialogHeader>

        {step === "kind" && (
          <div className="space-y-3">
            <p className="text-[14px] text-marine-deep/80">¿Qué tipo de decisión?</p>
            <label
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                kind === "quick_poll" ? "border-primary bg-primary/5" : "hover:border-primary"
              }`}
            >
              <input
                type="radio"
                checked={kind === "quick_poll"}
                onChange={() => setKindAndAdjust("quick_poll")}
                className="mt-1 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">Encuesta rápida</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  1 pregunta, voto simple. Útil para decisiones cotidianas (ej: "¿Renovamos la piscina?").
                </p>
              </div>
            </label>
            <label
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                kind === "formal_assembly" ? "border-primary bg-primary/5" : "hover:border-primary"
              }`}
            >
              <input
                type="radio"
                checked={kind === "formal_assembly"}
                onChange={() => setKindAndAdjust("formal_assembly")}
                className="mt-1 h-4 w-4 cursor-pointer"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">Asamblea formal</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Múltiples preguntas, voto ponderado por alícuota disponible, quórum requerido.
                </p>
              </div>
            </label>
          </div>
        )}

        {step === "info" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dec-title">Título</Label>
              <Input
                id="dec-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  kind === "quick_poll"
                    ? "Ej: ¿Renovamos la piscina este año?"
                    : "Ej: Asamblea ordinaria 2026 · Aprobación presupuesto"
                }
                maxLength={200}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dec-desc">Descripción (opcional)</Label>
              <textarea
                id="dec-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Contexto adicional..."
              />
            </div>
          </div>
        )}

        {step === "questions" && (
          <div className="space-y-4">
            {questions.map((q, qIdx) => (
              <div key={q.id} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Label className="font-meta text-mute">PREGUNTA {qIdx + 1}</Label>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      className="font-meta text-destructive hover:underline"
                    >
                      QUITAR
                    </button>
                  )}
                </div>
                <Input
                  value={q.question}
                  onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                  placeholder="Pregunta"
                  maxLength={300}
                />
                <div className="space-y-1.5">
                  {q.options.map((option, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                        placeholder={`Opción ${oIdx + 1}`}
                        maxLength={100}
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(qIdx, oIdx)}
                          className="font-meta text-mute hover:text-destructive"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => addOption(qIdx)}>
                    + Agregar opción
                  </Button>
                </div>
              </div>
            ))}
            {kind === "formal_assembly" && (
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                + Agregar pregunta
              </Button>
            )}
          </div>
        )}

        {step === "config" && (
          <div className="space-y-4">
            {/* Solo en asamblea formal: en una encuesta rápida los resultados se
                cuentan por cabeza, así que ofrecer voto ponderado ahí era una
                promesa que el cómputo no cumple. */}
            {kind === "formal_assembly" && (
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={weighted}
                  onChange={(e) => setWeighted(e.target.checked)}
                  className="mt-1 h-4 w-4 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Voto ponderado por alícuota</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cada propietario vota con su % de alícuota. Requiere tener las alícuotas
                    cargadas. Inquilinos votan con peso 0 (queda registro pero no afecta cómputo).
                  </p>
                </div>
              </label>
            )}

            {kind === "formal_assembly" && (
              <div className="space-y-2">
                <Label htmlFor="quorum">Quórum requerido (%)</Label>
                <Input
                  id="quorum"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={quorumPct}
                  onChange={(e) => setQuorumPct(e.target.value)}
                  placeholder="50"
                />
                <p className="text-[12px] text-mute">
                  % de alícuota o residentes que deben votar para aprobar.
                </p>
              </div>
            )}

            {kind === "formal_assembly" && (
              <div className="space-y-2">
                <Label htmlFor="scheduled">Fecha programada (asamblea)</Label>
                <Input
                  id="scheduled"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="closes">Cierre de votación</Label>
              <Input
                id="closes"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
              />
              <p className="text-[12px] text-mute">
                Después de esta fecha no se aceptan más votos.
              </p>
            </div>

            {closesBeforeScheduled && (
              <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                ⚠ La votación cierra ANTES de la fecha de la asamblea. ¿Es intencional?
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded p-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={loading || step === "kind"}
            onClick={prevStep}
          >
            Volver
          </Button>
          {step === "config" ? (
            <Button type="button" className="flex-1" onClick={submit} disabled={loading}>
              {loading ? "Creando…" : "Crear decisión"}
            </Button>
          ) : (
            <Button type="button" className="flex-1" disabled={loading} onClick={nextStep}>
              Siguiente
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function stepIndex(s: Step): number {
  return ["kind", "info", "questions", "config"].indexOf(s) + 1;
}
function stepLabel(s: Step): string {
  switch (s) {
    case "kind": return "Tipo";
    case "info": return "Título y descripción";
    case "questions": return "Preguntas y opciones";
    case "config": return "Configuración";
  }
}
