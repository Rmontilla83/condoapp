"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAmenityPolicies } from "./settings-actions";
import type { CommonArea } from "@/types/database";

interface PolicyDraft {
  id: string;
  name: string;
  max_reservations_per_week: string;
  max_duration_hours: string;
  min_advance_hours: string;
  max_advance_days: string;
}

function toStr(v: number | null): string {
  return v === null || v === undefined ? "" : String(v);
}

export function AmenityPoliciesForm({ areas }: { areas: CommonArea[] }) {
  const [drafts, setDrafts] = useState<PolicyDraft[]>(() =>
    areas.map((a) => ({
      id: a.id,
      name: a.name,
      max_reservations_per_week: toStr(a.max_reservations_per_week),
      max_duration_hours: toStr(a.max_duration_hours),
      min_advance_hours: a.min_advance_hours ? String(a.min_advance_hours) : "",
      max_advance_days: toStr(a.max_advance_days),
    })),
  );
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  function update(id: string, field: keyof PolicyDraft, value: string) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }

  async function handleSave() {
    setLoading(true);
    setFeedback(null);
    const fd = new FormData();
    fd.set(
      "policies",
      JSON.stringify(
        drafts.map((d) => ({
          id: d.id,
          max_reservations_per_week: d.max_reservations_per_week,
          max_duration_hours: d.max_duration_hours,
          min_advance_hours: d.min_advance_hours,
          max_advance_days: d.max_advance_days,
        })),
      ),
    );
    const res = await updateAmenityPolicies(fd);
    if ("error" in res) {
      setFeedback({ type: "error", msg: res.error });
      setLoading(false);
      return;
    }
    setFeedback({ type: "ok", msg: "Políticas guardadas" });
    setLoading(false);
    setTimeout(() => window.location.reload(), 500);
  }

  if (areas.length === 0) {
    return (
      <p className="text-[13px] text-mute italic">
        Tu condominio no tiene amenidades registradas todavía.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-mute">
        Deja un campo vacío para “sin límite”. Las reglas se aplican cuando un residente intenta
        reservar.
      </p>

      {drafts.map((d) => (
        <div key={d.id} className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-[14px] font-medium text-marine-deep">{d.name}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Máx reservas por semana"
              value={d.max_reservations_per_week}
              onChange={(v) => update(d.id, "max_reservations_per_week", v)}
              placeholder="Sin límite"
            />
            <Field
              label="Duración máxima (horas)"
              value={d.max_duration_hours}
              onChange={(v) => update(d.id, "max_duration_hours", v)}
              placeholder="Sin límite"
              step="0.5"
            />
            <Field
              label="Anticipación mínima (horas)"
              value={d.min_advance_hours}
              onChange={(v) => update(d.id, "min_advance_hours", v)}
              placeholder="0"
            />
            <Field
              label="Anticipación máxima (días)"
              value={d.max_advance_days}
              onChange={(v) => update(d.id, "max_advance_days", v)}
              placeholder="Sin límite"
            />
          </div>
        </div>
      ))}

      {feedback && (
        <div
          className={`rounded-lg border p-2.5 text-sm ${
            feedback.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Guardando…" : "Guardar políticas"}
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-meta text-mute">{label}</label>
      <Input
        type="number"
        min="0"
        step={step ?? "1"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
