"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QRModal } from "./qr-modal";
import { computeDisplayStatus } from "./pass-list-helpers";
import { VISITOR_KIND_BY_ID } from "./visitor-kinds";
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

          const kindMeta = VISITOR_KIND_BY_ID[pass.visitor_kind] ?? VISITOR_KIND_BY_ID.guest;

          return (
            <div
              key={pass.id}
              className="rounded-2xl bg-card border border-border p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-marine-deep/5 border border-marine-deep/10 shrink-0 text-[18px]"
                  title={kindMeta.label}
                >
                  {kindMeta.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-marine-deep truncate">
                    {pass.visitor_name}
                    {pass.vehicle_plate && (
                      <span className="ml-2 font-meta text-cyan">🚗 {pass.vehicle_plate}</span>
                    )}
                  </p>
                  <p className="mt-0.5 font-meta text-mute truncate">
                    {kindMeta.label.toUpperCase()}
                    {pass.visitor_id_number ? ` · ${pass.visitor_id_number}` : ""}
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
