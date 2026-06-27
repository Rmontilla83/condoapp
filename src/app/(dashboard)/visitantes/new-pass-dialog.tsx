"use client";

import { useMemo, useState } from "react";
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
import { createAccessPass } from "./actions";
import { QRDisplay } from "./qr-display";
import { buildVerifyUrl, buildWhatsAppMessage, buildWhatsAppUrl } from "./pass-list-helpers";
import { VISITOR_KINDS, VISITOR_KIND_BY_ID, resolveDurationHours } from "./visitor-kinds";
import type { VisitorKind } from "@/types/database";

export function NewPassDialog({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ qrCode: string; passId: string; visitorName: string } | null>(null);
  const [kind, setKind] = useState<VisitorKind>("guest");
  const [customHours, setCustomHours] = useState<string>("");

  const effectiveHours = useMemo(() => {
    const parsed = customHours ? Number.parseFloat(customHours) : null;
    return resolveDurationHours(kind, parsed);
  }, [kind, customHours]);

  const validUntilLabel = useMemo(() => {
    const dt = new Date(Date.now() + effectiveHours * 60 * 60 * 1000);
    return dt.toLocaleDateString("es", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [effectiveHours]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const visitorName = (formData.get("visitor_name") as string)?.trim() ?? "";
    const res = await createAccessPass(formData);

    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    if ("success" in res && res.qrCode && res.passId) {
      setResult({ qrCode: res.qrCode, passId: res.passId, visitorName });
    }
    setLoading(false);
  }

  function handleClose() {
    if (result) {
      // Cerrar después de generar exitosamente → recargar para mostrar el pase nuevo en lista
      window.location.reload();
      return;
    }
    setOpen(false);
    setResult(null);
    setError("");
    setKind("guest");
    setCustomHours("");
  }

  const qrUrl =
    result && typeof window !== "undefined"
      ? buildVerifyUrl(
          result.qrCode,
          process.env.NEXT_PUBLIC_PORTAL_URL ?? window.location.origin,
        )
      : "";

  const whatsappUrl = result
    ? buildWhatsAppUrl(buildWhatsAppMessage(orgName, { visitor_name: result.visitorName }, qrUrl))
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger render={<Button />}>
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nuevo visitante
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle>Registrar visitante</DialogTitle>
              <DialogDescription>
                Selecciona el tipo de visita y completa los datos. La duración se ajusta al tipo, pero
                puedes sobreescribirla si tu visita necesita más tiempo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de visita</Label>
                <input type="hidden" name="kind" value={kind} />
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {VISITOR_KINDS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setKind(k.id)}
                      disabled={loading}
                      aria-pressed={kind === k.id}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition ${
                        kind === k.id
                          ? "border-primary bg-primary/5 text-marine-deep"
                          : "border-border hover:border-primary/40 text-mute"
                      }`}
                    >
                      <span className="text-[18px] leading-none">{k.icon}</span>
                      <span className="text-[11px] font-meta">{k.label.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[12px] text-mute">
                  VIGENTE {effectiveHours} HORA{effectiveHours !== 1 ? "S" : ""} · HASTA {validUntilLabel.toUpperCase()}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitor_name">Nombre del visitante</Label>
                <Input
                  id="visitor_name"
                  name="visitor_name"
                  placeholder={
                    kind === "delivery" ? "Ej: Rappi — Mensajero" :
                    kind === "rideshare" ? "Ej: Uber Black" :
                    kind === "service" ? "Ej: Técnico CANTV" :
                    kind === "moving" ? "Ej: Mudanza Express" :
                    kind === "family" ? "Ej: María García Pérez" :
                    "Ej: Juan Pérez"
                  }
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="visitor_id">Cédula / ID</Label>
                  <Input
                    id="visitor_id"
                    name="visitor_id"
                    placeholder="Ej: V-18.456.789"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_plate">Placa (opcional)</Label>
                  <Input
                    id="vehicle_plate"
                    name="vehicle_plate"
                    placeholder="AB123CD"
                    maxLength={16}
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom_hours">
                  Horas válidas (opcional · default {VISITOR_KIND_BY_ID[kind].defaultHours}h)
                </Label>
                <Input
                  id="custom_hours"
                  name="custom_hours"
                  type="number"
                  min={1}
                  max={168}
                  step={1}
                  placeholder={`${VISITOR_KIND_BY_ID[kind].defaultHours}`}
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                />
                <p className="text-[11px] text-mute">Entre 1 y 168 horas (1 semana máximo).</p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? "Generando…" : "Generar QR"}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>QR generado</DialogTitle>
              <DialogDescription>
                Comparte este QR con tu visitante por WhatsApp. Vigente por {effectiveHours} hora
                {effectiveHours !== 1 ? "s" : ""}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-2xl border-2 border-dashed border-primary/30 p-4 bg-primary/5">
                <QRDisplay value={qrUrl} size={180} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                El vigilante revisará este QR en pantalla del visitante para permitir el acceso.
              </p>
              <div className="flex gap-3 w-full">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Compartir por WhatsApp
                  </Button>
                </a>
                <Button variant="outline" onClick={handleClose}>
                  Listo
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
