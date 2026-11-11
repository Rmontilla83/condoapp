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
import { bs, usd } from "@/lib/format";
import { hayTasaPara, tasaEn, type SerieTasas, type TipoContable } from "@/lib/contabilidad/gastos";
import { createExpense } from "./actions";
import type { ExpenseCategory } from "@/types/database";

interface Props {
  categories: ExpenseCategory[];
  /** Centros de costo activos. Si hay alguno, cada gasto debe decir el suyo. */
  centros?: { id: string; name: string }[];
  /** Saldo disponible de cada fondo. */
  saldoFondo?: number;
  saldoContingencia?: number;
  /** Tasas BCV, para mostrar la equivalencia antes de guardar. */
  tasas?: SerieTasas;
  /** Lo que falta por pagar, en bolívares. */
  porPagar?: { provisiones: number; retenciones: number };
}

const campo = "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm";
const hoy = () => new Date().toISOString().split("T")[0];

const AYUDA_TIPO: Record<TipoContable, string> = {
  gasto: "Sale dinero del banco.",
  provision: "El gasto se reconoce ahora y se paga después. No sale dinero del banco.",
  pago_provision: "Sale dinero del banco para pagar algo ya provisionado. No se cuenta otra vez como gasto.",
  entero_retencion: "Sale dinero del banco para pagarle al SENIAT lo retenido. No se cuenta otra vez como gasto.",
};

export function NewExpenseDialog({ categories, centros = [], saldoFondo = 0, saldoContingencia = 0, tasas = [], porPagar = { provisiones: 0, retenciones: 0 } }: Props) {
  const [conFondo, setConFondo] = useState(false);
  const [fondo, setFondo] = useState<"reserva" | "contingencia">("reserva");
  const saldoDelFondo = fondo === "contingencia" ? saldoContingencia : saldoFondo;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vendorMode, setVendorMode] = useState<"none" | "new">("none");
  const [tipo, setTipo] = useState<TipoContable>("gasto");
  const [moneda, setMoneda] = useState<"VES" | "USD">("VES");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [retencion, setRetencion] = useState("");

  function reiniciar() {
    setError("");
    setVendorMode("none");
    setConFondo(false);
    setTipo("gasto");
    setMoneda("VES");
    setMonto("");
    setFecha(hoy());
    setRetencion("");
  }

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

  const conTasa = hayTasaPara(tasas, fecha);
  const tasa = tasaEn(tasas, fecha);
  const valor = parseFloat(monto) || 0;
  const retenido = parseFloat(retencion) || 0;
  const enMoneda = moneda === "VES" ? bs : usd;
  const equivalencia = moneda === "VES" ? usd(tasa > 0 ? valor / tasa : 0) : bs(valor * tasa);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reiniciar();
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
            <Label htmlFor="tipo_contable">Tipo de registro</Label>
            <select
              id="tipo_contable"
              name="tipo_contable"
              className={campo}
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoContable);
                setConFondo(false);
                setRetencion("");
              }}
            >
              <option value="gasto">Gasto</option>
              <option value="provision">Provisión</option>
              <option value="pago_provision">Pago de una provisión</option>
              <option value="entero_retencion">Entero de retenciones de ISLR</option>
            </select>
            <p className="text-[12px] text-mute">
              {AYUDA_TIPO[tipo]}
              {tipo === "pago_provision" && ` Provisiones por pagar: ${bs(porPagar.provisiones)}.`}
              {tipo === "entero_retencion" && ` Retenciones por enterar: ${bs(porPagar.retenciones)}.`}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category_id">Categoría</Label>
            <select id="category_id" name="category_id" className={campo} required defaultValue="">
              <option value="" disabled>
                Selecciona…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {centros.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="cost_center_id">Centro de costo</Label>
              <select id="cost_center_id" name="cost_center_id" className={campo} required defaultValue="">
                <option value="" disabled>
                  Selecciona…
                </option>
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              name="description"
              placeholder="Ej: Reparación bomba de agua"
              required
            />
          </div>
          <div className="grid grid-cols-[6.5rem_1fr] gap-3">
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <select
                id="currency"
                name="currency"
                className={campo}
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as "VES" | "USD")}
              >
                <option value="VES">Bs</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense_date">Fecha</Label>
            <Input
              id="expense_date"
              name="expense_date"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
            {conTasa ? (
              <p className="text-[12px] text-mute">
                Tasa BCV: {tasa.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                {valor > 0 && `. Equivale a ${equivalencia}.`}
              </p>
            ) : (
              <p className="text-[12px] text-destructive">No hay tasa BCV registrada para esa fecha.</p>
            )}
          </div>

          {tipo === "gasto" && (
            <div className="space-y-2">
              <Label htmlFor="retencion_islr">Retención de ISLR (opcional)</Label>
              <Input
                id="retencion_islr"
                name="retencion_islr"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={retencion}
                onChange={(e) => setRetencion(e.target.value)}
              />
              <p className="text-[12px] text-mute">
                {retenido > 0 && valor > retenido
                  ? `Del banco salen ${enMoneda(valor - retenido)}. Lo retenido queda por enterar al SENIAT.`
                  : "El monto que indique el contador, en la misma moneda del gasto."}
              </p>
            </div>
          )}

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
          {tipo === "gasto" && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <label className="flex cursor-pointer items-start gap-2 text-[14px]">
                <input
                  type="checkbox"
                  name="paid_from_reserve"
                  checked={conFondo}
                  onChange={(e) => setConFondo(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer"
                />
                <span>
                  Se paga con un fondo del condominio
                  <span className="block text-[12px] text-mute">Reserva o contingencia, con el acta que lo aprueba.</span>
                </span>
              </label>
              {conFondo && (
                <div className="space-y-2">
                  <Label htmlFor="fund">Fondo</Label>
                  <select
                    id="fund"
                    name="fund"
                    value={fondo}
                    onChange={(e) => setFondo(e.target.value === "contingencia" ? "contingencia" : "reserva")}
                    className={campo}
                  >
                    <option value="reserva">Fondo de reserva</option>
                    <option value="contingencia">Fondo de contingencia</option>
                  </select>
                  <p className="text-[12px] text-mute">Saldo disponible: ${saldoDelFondo.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <Label htmlFor="reserve_acta">Acta o acuerdo que lo aprueba</Label>
                  <Input id="reserve_acta" name="reserve_acta" required minLength={5} maxLength={200} placeholder="Asamblea del 15/03/2026" />
                </div>
              )}
            </div>
          )}
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
            <Button type="submit" className="flex-1" disabled={loading || !conTasa}>
              {loading ? "Guardando…" : "Registrar gasto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
