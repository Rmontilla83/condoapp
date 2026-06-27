"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRDisplay } from "./qr-display";
import {
  buildVerifyUrl,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  computeDisplayStatus,
} from "./pass-list-helpers";
import { VISITOR_KIND_BY_ID } from "./visitor-kinds";
import type { AccessPass } from "@/types/database";

interface Props {
  pass: AccessPass | null;
  orgName: string;
  open: boolean;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "ACTIVO", className: "bg-cyan/10 text-cyan border-cyan/30" },
  used: { label: "USADO", className: "bg-mute/15 text-mute border-mute/30" },
  expired: { label: "EXPIRADO", className: "bg-mute/15 text-mute border-mute/30" },
  cancelled: { label: "CANCELADO", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function QRModal({ pass, orgName, open, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState("");

  useEffect(() => {
    if (pass && typeof window !== "undefined") {
      setVerifyUrl(
        buildVerifyUrl(
          pass.qr_code,
          process.env.NEXT_PUBLIC_PORTAL_URL ?? window.location.origin,
        ),
      );
    }
  }, [pass]);

  if (!pass) return null;

  const displayStatus = computeDisplayStatus(pass);
  const badge = STATUS_BADGE[displayStatus] ?? STATUS_BADGE.expired;
  const validUntil = new Date(pass.valid_until);
  const isCopiable = displayStatus === "active";
  const message = buildWhatsAppMessage(orgName, pass, verifyUrl);
  const whatsappUrl = buildWhatsAppUrl(message);
  const kindMeta = VISITOR_KIND_BY_ID[pass.visitor_kind] ?? VISITOR_KIND_BY_ID.guest;

  async function handleCopy() {
    try {
      if (navigator.clipboard && verifyUrl) {
        await navigator.clipboard.writeText(verifyUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // Fallback: select text in a temp textarea (caso clipboard bloqueada)
      const ta = document.createElement("textarea");
      ta.value = verifyUrl;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // Silent fail
      }
      document.body.removeChild(ta);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{pass.visitor_name}</span>
            <span className={`font-meta px-2 py-0.5 rounded-md border ${badge.className}`}>
              {badge.label}
            </span>
          </DialogTitle>
          <DialogDescription>
            {kindMeta.icon} {kindMeta.label}
            {pass.vehicle_plate ? ` · 🚗 ${pass.vehicle_plate}` : ""}
            {pass.visitor_id_number ? ` · ${pass.visitor_id_number}` : ""}
            {" — Válido hasta "}
            {validUntil.toLocaleDateString("es", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </DialogDescription>
        </DialogHeader>

        {isCopiable ? (
          <>
            <div className="flex justify-center py-4">
              <div className="rounded-2xl border-2 border-dashed border-primary/30 p-4 bg-primary/5">
                <QRDisplay value={verifyUrl} size={256} />
              </div>
            </div>

            <p className="text-[12px] text-mute text-center px-4">
              El vigilante revisa el QR del visitante en pantalla y permite el acceso.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Compartir por WhatsApp
                </Button>
              </a>
              <Button variant="outline" onClick={handleCopy}>
                {copied ? "✓ Enlace copiado" : "Copiar enlace"}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </>
        ) : (
          <div className="py-6 text-center space-y-3">
            <p className="text-[14px] text-mute">
              Este pase ya no es válido. {displayStatus === "used" && "El visitante ya entró."}
              {displayStatus === "expired" && "Generá uno nuevo si todavía lo necesitas."}
              {displayStatus === "cancelled" && "Fue cancelado."}
            </p>
            <Button onClick={onClose}>Entendido</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
