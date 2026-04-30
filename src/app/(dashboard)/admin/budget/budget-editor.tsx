"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveBudget, approveBudget, archiveBudget } from "./actions";
import type { ExpenseCategory, OrgBudget, OrgBudgetItem } from "@/types/database";

interface ItemDraft {
  category_id: string;
  monthly_amount: string;
  monthly_overrides: Record<string, number>;
  notes: string;
}

interface Props {
  year: number;
  budget: OrgBudget | null;
  items: OrgBudgetItem[];
  categories: ExpenseCategory[];
  executedByCategoryId: Record<string, number>;
}

export function BudgetEditor({ year, budget, items, categories, executedByCategoryId }: Props) {
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>(() => {
    const map: Record<string, ItemDraft> = {};
    for (const cat of categories) {
      const existing = items.find((it) => it.category_id === cat.id);
      map[cat.id] = {
        category_id: cat.id,
        monthly_amount: existing ? String(existing.monthly_amount) : "",
        monthly_overrides: (existing?.monthly_overrides as Record<string, number>) ?? {},
        notes: existing?.notes ?? "",
      };
    }
    return map;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  const isApproved = budget?.status === "approved";
  const isArchived = budget?.status === "archived";

  const totalYearly = useMemo(() => {
    let total = 0;
    for (const cat of categories) {
      const d = drafts[cat.id];
      if (!d) continue;
      const baseAmount = parseFloat(d.monthly_amount) || 0;
      for (let m = 1; m <= 12; m++) {
        const override = d.monthly_overrides[String(m)];
        total += typeof override === "number" ? override : baseAmount;
      }
    }
    return total;
  }, [drafts, categories]);

  function updateAmount(catId: string, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [catId]: { ...prev[catId], monthly_amount: value },
    }));
  }

  async function handleSave() {
    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.set("year", String(year));
    const items = Object.values(drafts)
      .filter((d) => parseFloat(d.monthly_amount) > 0 || Object.keys(d.monthly_overrides).length > 0)
      .map((d) => ({
        category_id: d.category_id,
        monthly_amount: parseFloat(d.monthly_amount) || 0,
        monthly_overrides: Object.keys(d.monthly_overrides).length > 0 ? d.monthly_overrides : null,
        notes: d.notes || null,
      }));
    fd.set("items", JSON.stringify(items));

    const res = await saveBudget(fd);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setFeedback({ type: "ok", msg: "Presupuesto guardado" });
    setLoading(false);
    setTimeout(() => window.location.reload(), 600);
  }

  async function handleApprove() {
    if (!budget) return;
    if (!confirm("¿Aprobar el presupuesto? Se vuelve visible para todos los residentes.")) return;
    setLoading(true);
    const res = await approveBudget(budget.id);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    window.location.reload();
  }

  async function handleArchive() {
    if (!budget) return;
    if (!confirm("¿Archivar el presupuesto? Ya no se mostrará en /finanzas.")) return;
    setLoading(true);
    const res = await archiveBudget(budget.id);
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <p className="font-meta text-mute">PRESUPUESTO {year}</p>
          <p className="mt-1 text-[15px] font-medium text-marine-deep">
            Estado:{" "}
            <span
              className={
                isApproved
                  ? "text-cyan"
                  : isArchived
                    ? "text-mute"
                    : "text-ember"
              }
            >
              {budget?.status?.toUpperCase() ?? "BORRADOR (sin guardar)"}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-meta text-mute">TOTAL ANUAL</p>
          <p className="font-display text-[28px] text-marine-deep">${totalYearly.toFixed(2)}</p>
        </div>
      </div>

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

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-card border border-border p-6 space-y-3">
        <div className="grid grid-cols-[1fr_140px_140px_140px] gap-3 pb-2 border-b border-border font-meta text-mute">
          <span>CATEGORÍA</span>
          <span className="text-right">MENSUAL</span>
          <span className="text-right">ANUAL</span>
          <span className="text-right">EJECUTADO</span>
        </div>
        {categories.map((cat) => {
          const d = drafts[cat.id];
          if (!d) return null;
          const monthly = parseFloat(d.monthly_amount) || 0;
          let yearly = 0;
          for (let m = 1; m <= 12; m++) {
            const ov = d.monthly_overrides[String(m)];
            yearly += typeof ov === "number" ? ov : monthly;
          }
          const executed = executedByCategoryId[cat.id] ?? 0;
          const overspent = yearly > 0 && executed > yearly;

          return (
            <div
              key={cat.id}
              className="grid grid-cols-[1fr_140px_140px_140px] gap-3 items-center"
            >
              <span className="text-[14px] text-marine-deep">
                <span className="mr-2">{cat.icon}</span>
                {cat.label}
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={d.monthly_amount}
                onChange={(e) => updateAmount(cat.id, e.target.value)}
                disabled={isArchived || loading}
                placeholder="0.00"
                className="text-right font-mono"
              />
              <span className="text-right text-[14px] font-mono text-marine-deep">
                ${yearly.toFixed(0)}
              </span>
              <span
                className={`text-right text-[14px] font-mono ${
                  overspent ? "text-destructive" : "text-mute"
                }`}
              >
                ${executed.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 justify-end">
        {!isArchived && !isApproved && (
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Guardando…" : "Guardar borrador"}
          </Button>
        )}
        {budget && !isApproved && !isArchived && (
          <Button onClick={handleApprove} disabled={loading} variant="outline">
            Aprobar
          </Button>
        )}
        {budget && isApproved && (
          <Button onClick={handleArchive} disabled={loading} variant="outline">
            Archivar
          </Button>
        )}
      </div>

      {isApproved && (
        <p className="font-meta text-cyan">
          ✓ APROBADO {budget?.approved_at && `EL ${new Date(budget.approved_at).toLocaleDateString("es")}`}
        </p>
      )}
    </div>
  );
}
