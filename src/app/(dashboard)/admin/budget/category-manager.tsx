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
import {
  createExpenseCategory,
  updateExpenseCategory,
  deactivateExpenseCategory,
} from "./category-actions";
import type { ExpenseCategory } from "@/types/database";

export function CategoryManager({ categories }: { categories: ExpenseCategory[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // edición inline por categoría
  const [edits, setEdits] = useState<Record<string, { label: string; icon: string }>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, { label: c.label, icon: c.icon ?? "·" }])),
  );

  // nueva categoría
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("");

  function setEdit(id: string, patch: Partial<{ label: string; icon: string }>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function run(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setLoading(true);
    setError("");
    const res = await fn();
    if (res?.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setLoading(false);
    window.location.reload();
  }

  async function saveRow(cat: ExpenseCategory) {
    const e = edits[cat.id];
    const fd = new FormData();
    fd.set("id", cat.id);
    fd.set("label", e.label);
    fd.set("icon", e.icon);
    await run(() => updateExpenseCategory(fd));
  }

  async function removeRow(cat: ExpenseCategory) {
    if (!confirm(`¿Quitar la categoría "${cat.label}"? Dejará de aparecer al registrar gastos. Los gastos antiguos no se borran.`)) return;
    const fd = new FormData();
    fd.set("id", cat.id);
    await run(() => deactivateExpenseCategory(fd));
  }

  async function addNew() {
    if (!newLabel.trim()) {
      setError("Escribe el nombre de la nueva categoría");
      return;
    }
    const fd = new FormData();
    fd.set("label", newLabel);
    fd.set("icon", newIcon);
    await run(() => createExpenseCategory(fd));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Administrar categorías
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorías de gasto</DialogTitle>
          <DialogDescription>
            Renombra o cambia el ícono de cualquier categoría. Agrega las que necesites. Las del
            sistema no se pueden eliminar, pero sí renombrar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {categories.map((cat) => {
            const e = edits[cat.id] ?? { label: cat.label, icon: cat.icon ?? "·" };
            const dirty = e.label !== cat.label || e.icon !== (cat.icon ?? "·");
            return (
              <div key={cat.id} className="flex items-center gap-2">
                <Input
                  value={e.icon}
                  onChange={(ev) => setEdit(cat.id, { icon: ev.target.value })}
                  className="w-14 text-center"
                  maxLength={8}
                  aria-label="Ícono"
                />
                <Input
                  value={e.label}
                  onChange={(ev) => setEdit(cat.id, { label: ev.target.value })}
                  className="flex-1"
                  maxLength={60}
                  aria-label="Nombre"
                />
                {cat.is_system && (
                  <span className="font-meta text-mute shrink-0" title="Categoría del sistema">
                    SISTEMA
                  </span>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading || !dirty}
                  onClick={() => saveRow(cat)}
                >
                  Guardar
                </Button>
                {!cat.is_system && (
                  <button
                    type="button"
                    onClick={() => removeRow(cat)}
                    disabled={loading}
                    className="font-meta text-mute hover:text-destructive px-1 shrink-0"
                    aria-label="Quitar"
                    title="Quitar categoría"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <Label className="font-meta text-mute">NUEVA CATEGORÍA</Label>
          <div className="flex items-center gap-2">
            <Input
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="🏷️"
              className="w-14 text-center"
              maxLength={8}
              aria-label="Ícono nuevo"
            />
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ej: Ascensores"
              className="flex-1"
              maxLength={60}
              aria-label="Nombre nuevo"
            />
            <Button type="button" size="sm" disabled={loading} onClick={addNew}>
              Agregar
            </Button>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded p-2">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
