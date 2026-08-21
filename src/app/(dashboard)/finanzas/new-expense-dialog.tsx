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
import { createExpense } from "./actions";
import type { ExpenseCategory } from "@/types/database";

interface Props {
  categories: ExpenseCategory[];
}

export function NewExpenseDialog({ categories }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vendorMode, setVendorMode] = useState<"none" | "new">("none");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await createExpense(formData);

    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
    window.location.reload();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setError("");
          setVendorMode("none");
        }
      }}
    >
      <DialogTrigger render={<Button />}>
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Registrar gasto
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar gasto del condominio</DialogTitle>
          <DialogDescription>
            Cada gasto queda visible para todos los residentes. Adjunta el recibo o factura.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category_id">Categoría</Label>
            <select
              id="category_id"
              name="category_id"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Selecciona…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              name="description"
              placeholder="Ej: Reparación bomba de agua"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto (USD)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense_date">Fecha</Label>
              <Input
                id="expense_date"
                name="expense_date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          </div>

          {/* Vendor: opcional, quick-create por nombre.
              PR #2 lo extiende con autocomplete de vendors existentes. */}
          <div className="space-y-2">
            <Label htmlFor="vendor_new_name">Proveedor (opcional)</Label>
            <Input
              id="vendor_new_name"
              name="vendor_new_name"
              placeholder="Ej: Plomería Total"
              maxLength={100}
              onChange={(e) => setVendorMode(e.target.value ? "new" : "none")}
            />
            {vendorMode === "new" && (
              <p className="text-[12px] text-mute">
                Si el proveedor ya existe en el condo, se reutiliza. Si no, se crea automáticamente.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">Recibo o factura (foto)</Label>
            <Input
              id="receipt"
              name="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Adjunta foto del recibo para total transparencia
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Guardando…" : "Registrar gasto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
