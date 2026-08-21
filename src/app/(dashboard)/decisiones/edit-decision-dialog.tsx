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
import { updateDecision } from "./actions";

interface QuestionDraft {
  id: string;
  question: string;
  options: string[];
}

interface Props {
  decisionId: string;
  title: string;
  description: string | null;
  questions: Array<{ id: string; question: string; options: string[] }>;
  /** Si ya hay votos, solo se pueden editar título y descripción. */
  hasVotes: boolean;
}

export function EditDecisionDialog({ decisionId, title: initialTitle, description: initialDesc, questions: initialQuestions, hasVotes }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDesc ?? "");
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initialQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options.length >= 2 ? [...q.options] : [...q.options, "", ""].slice(0, 2),
    })),
  );

  function reset() {
    setTitle(initialTitle);
    setDescription(initialDesc ?? "");
    setQuestions(
      initialQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options.length >= 2 ? [...q.options] : [...q.options, "", ""].slice(0, 2),
      })),
    );
    setError("");
    setLoading(false);
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

  async function submit() {
    setError("");
    if (!title.trim()) {
      setError("Título requerido");
      return;
    }
    if (!hasVotes) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question.trim()) {
          setError(`Pregunta ${i + 1}: texto requerido`);
          return;
        }
        const trimmed = q.options.map((o) => o.trim());
        const emptyIdx = trimmed.findIndex((o) => !o);
        if (emptyIdx !== -1) {
          setError(`Pregunta ${i + 1}: la opción ${emptyIdx + 1} está vacía. Complétala o quítala.`);
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
    }

    setLoading(true);
    const fd = new FormData();
    fd.set("decision_id", decisionId);
    fd.set("title", title);
    fd.set("description", description);
    if (!hasVotes) {
      fd.set(
        "questions",
        JSON.stringify(
          questions.map((q) => ({
            question: q.question.trim(),
            options: q.options.map((o) => o.trim()).filter(Boolean),
          })),
        ),
      );
    }

    const res = await updateDecision(fd);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    setOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTimeout(() => reset(), 200);
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" className="text-xs" />}>
        Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar decisión</DialogTitle>
          <DialogDescription>
            {hasVotes
              ? "Ya hay votos: solo puedes corregir título y descripción."
              : "Corrige título, descripción, pregunta y opciones."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc">Descripción</Label>
            <textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm"
              placeholder="Contexto adicional..."
            />
          </div>

          {hasVotes ? (
            <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠ Esta decisión ya tiene votos. Para no alterar resultados, las preguntas y opciones quedan bloqueadas.
            </p>
          ) : (
            <div className="space-y-4 pt-2">
              {questions.map((q, qIdx) => (
                <div key={q.id} className="rounded-lg border border-border p-3 space-y-3">
                  <Label className="font-meta text-mute">PREGUNTA {qIdx + 1}</Label>
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
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" className="flex-1" disabled={loading} onClick={submit}>
              {loading ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
