"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QRModal } from "./qr-modal";
import { computeDisplayStatus } from "./pass-list-helpers";
import type { AccessPass, PassStatus } from "@/types/database";

const statusConfig: Record<PassStatus, { label: string; tag: string }> = {
  active: { label: "ACTIVO", tag: "bg-cyan/10 text-cyan" },
  used: { label: "USADO", tag: "bg-mute/15 text-mute" },
  expired: { label: "EXPIRADO", tag: "bg-mute/15 text-mute" },
  cancelled: { label: "CANCELADO", tag: "bg-destructive/10 text-destructive" },
};

export type PassWithUnit = AccessPass & {
  units: { unit_number: string } | null;
};

interface Props {
  passes: PassWithUnit[];
  orgName: string;
  /** Cuando true, muestra "Apto X" como columna (útil en tab admin "Pases del condo"). */
  showUnit?: boolean;
  /** Cuando true, NO muestra el botón "Mostrar QR" (admin no comparte pases ajenos). */
  hideShareButton?: boolean;
}

export function PassList({ passes, orgName, showUnit = false, hideShareButton = false }: Props) {
  const [selectedPass, setSelectedPass] = useState<AccessPass | null>(null);

  if (passes.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border py-12 text-center">
        <p className="text-[14px] text-mute">Sin pases todavía.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {passes.map((pass) => {
          const displayStatus = computeDisplayStatus(pass);
          const config = statusConfig[displayStatus] ?? statusConfig.expired;
          const canShow = displayStatus === "active" && !hideShareButton;
          const unitLabel = showUnit
            ? pass.units?.unit_number
              ? `APTO ${pass.units.unit_number}`
              : "ÁREA COMÚN"
            : null;

          return (
            <div
              key={pass.id}
              className="rounded-2xl bg-card border border-border p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-marine-deep text-frost shrink-0">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-marine-deep truncate">
                    {pass.visitor_name}
                  </p>
                  <p className="mt-0.5 font-meta text-mute truncate">
                    {pass.visitor_id_number}
                    {unitLabel ? ` · ${unitLabel}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-meta text-mute hidden sm:inline">
                  {new Date(pass.created_at)
                    .toLocaleDateString("es", { day: "numeric", month: "short" })
                    .toUpperCase()}
                </span>
                {canShow ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPass(pass)}
                  >
                    Mostrar QR
                  </Button>
                ) : (
                  <span className={`font-meta px-2.5 py-1 rounded-md ${config.tag}`}>
                    {config.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <QRModal
        pass={selectedPass}
        orgName={orgName}
        open={selectedPass !== null}
        onClose={() => setSelectedPass(null)}
      />
    </>
  );
}
