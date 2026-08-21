"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { closeDecision } from "../actions";

/**
 * El botón "Cerrar asamblea" del detalle apuntaba a
 * `/decisiones?action=close&id=...` — un parámetro que ninguna página lee. Era
 * un link muerto: el admin lo tocaba, volvía al listado y la asamblea seguía
 * abierta. La única vía real de cierre estaba en la tarjeta del listado.
 *
 * Importa desde acá, además, porque editar las alícuotas queda bloqueado
 * mientras haya una asamblea ponderada abierta con votos: si no se puede
 * cerrar desde el detalle, ese bloqueo no tiene salida.
 */
export function CloseDecisionButton({ decisionId }: { decisionId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  async function handleClose() {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setLoading(true);
    setError("");
    const res = await closeDecision(decisionId);
    setLoading(false);
    if (res && "error" in res && res.error) {
      setError(res.error);
      setConfirmando(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleClose} disabled={loading}>
          {loading ? "Cerrando…" : confirmando ? "Sí, cerrar la asamblea" : "Cerrar asamblea"}
        </Button>
        {confirmando && !loading && (
          <Button size="sm" variant="outline" onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        )}
      </div>
      {confirmando && !loading && (
        <p className="text-[12px] text-ember-ink">
          Ya no se van a poder recibir más votos. Esto no se puede deshacer.
        </p>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
