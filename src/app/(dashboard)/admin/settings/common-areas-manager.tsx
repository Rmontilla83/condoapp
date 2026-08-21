"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCommonArea,
  updateCommonArea,
  setCommonAreaActive,
} from "./settings-actions";
import { AmenityPoliciesForm } from "./amenity-policies-form";
import type { CommonArea } from "@/types/database";

/**
 * Gestión de áreas comunes.
 *
 * `common_areas` no tenía ningún camino de creación en la app: solo se editaban
 * las políticas de las que ya existían. Un condominio nuevo tenía /reservas
 * permanentemente vacía y no había forma de arreglarlo desde el producto — el
 * mismo hueco que tenían las alícuotas.
 *
 * Las áreas NO se borran: `reservations.common_area_id` es ON DELETE CASCADE y
 * un borrado se llevaría el historial de reservas. Se retiran.
 */
export function CommonAreasManager({ areas }: { areas: CommonArea[] }) {
  const [creando, setCreando] = useState(areas.length === 0);
  const [editando, setEditando] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activas = areas.filter((a) => a.is_active);
  const retiradas = areas.filter((a) => !a.is_active);

  async function enviar(fd: FormData, accion: typeof createCommonArea) {
    setLoading(true);
    setError("");
    const res = await accion(fd);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    window.location.reload();
  }

  async function cambiarEstado(id: string, activar: boolean, nombre: string) {
    if (
      !activar &&
      !window.confirm(
        `¿Retirar "${nombre}"?\n\nDeja de aparecer para reservar, pero se conserva el historial de reservas. Puedes reactivarla cuando quieras.`,
      )
    ) {
      return;
    }
    setLoading(true);
    setError("");

    let res = await setCommonAreaActive(id, activar);

    // El servidor avisa si hay reservas futuras ya confirmadas: esos vecinos
    // se quedarían con una reserva de un espacio que dejó de existir.
    if ("needsConfirm" in res) {
      const n = res.futureReservations;
      const seguir = window.confirm(
        [
          `"${nombre}" tiene ${n} reserva${n !== 1 ? "s" : ""} futura${n !== 1 ? "s" : ""} ya confirmada${n !== 1 ? "s" : ""}.`,
          "",
          "Si la retiras, esas reservas quedan en pie pero nadie más puede reservar el espacio. Avísale a esos vecinos.",
          "",
          "¿Retirarla igual?",
        ].join(String.fromCharCode(10)),
      );
      if (!seguir) {
        setLoading(false);
        return;
      }
      res = await setCommonAreaActive(id, activar, true);
    }

    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-meta text-mute">ÁREAS COMUNES</p>
        <p className="mt-2 text-[15px] font-medium text-marine-deep">
          Qué puede reservar tu condominio
        </p>
        <p className="mt-1 text-[13px] text-mute max-w-2xl">
          El salón de fiestas, la piscina, la cancha. Mientras no cargues ninguna, la pantalla
          de Reservas de tus residentes está vacía.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
        >
          {error}
        </p>
      )}

      {/* Activas */}
      {activas.length > 0 && (
        <div className="space-y-3">
          {activas.map((area) =>
            editando === area.id ? (
              <FormularioArea
                key={area.id}
                area={area}
                loading={loading}
                onCancel={() => setEditando(null)}
                onSubmit={(fd) => {
                  fd.set("id", area.id);
                  return enviar(fd, updateCommonArea);
                }}
              />
            ) : (
              <div
                key={area.id}
                className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-marine-deep">{area.name}</p>
                  <p className="mt-1 font-meta text-mute">
                    {area.capacity ? `CAP. ${area.capacity} PERSONAS` : "SIN CAPACIDAD DEFINIDA"}
                  </p>
                  {area.description && (
                    <p className="mt-2 text-[13px] text-mute max-w-xl">{area.description}</p>
                  )}
                  {area.rules && (
                    <p className="mt-1 text-[12px] text-mute italic max-w-xl">{area.rules}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditando(area.id)}
                    disabled={loading}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cambiarEstado(area.id, false, area.name)}
                    disabled={loading}
                  >
                    Retirar
                  </Button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {activas.length === 0 && !creando && (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[14px] text-mute">
          Todavía no hay áreas comunes activas.
        </p>
      )}

      {/* Alta */}
      {creando ? (
        <FormularioArea
          loading={loading}
          onCancel={areas.length === 0 ? undefined : () => setCreando(false)}
          onSubmit={(fd) => enviar(fd, createCommonArea)}
        />
      ) : (
        <Button type="button" variant="outline" onClick={() => setCreando(true)} disabled={loading}>
          + Agregar área común
        </Button>
      )}

      {/* Retiradas */}
      {retiradas.length > 0 && (
        <div className="pt-2 space-y-2">
          <p className="font-meta text-mute">RETIRADAS</p>
          {retiradas.map((area) => (
            <div
              key={area.id}
              className="rounded-xl border border-border bg-cloud/40 p-3 flex flex-wrap items-center justify-between gap-3"
            >
              <span className="text-[14px] text-mute">{area.name}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cambiarEstado(area.id, true, area.name)}
                disabled={loading}
              >
                Reactivar
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Las políticas de reserva siguen viviendo en su propio formulario: solo
          aplican a las áreas activas y ya funcionaban bien. */}
      {activas.length > 0 && (
        <div className="pt-4 border-t border-border">
          <AmenityPoliciesForm areas={activas} />
        </div>
      )}
    </div>
  );
}

function FormularioArea({
  area,
  loading,
  onSubmit,
  onCancel,
}: {
  area?: CommonArea;
  loading: boolean;
  onSubmit: (fd: FormData) => void | Promise<void>;
  onCancel?: () => void;
}) {
  return (
    <form
      className="rounded-xl border border-cyan/40 bg-cyan/5 p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      <p className="font-meta text-cyan-ink">
        {area ? "EDITAR ÁREA" : "NUEVA ÁREA COMÚN"}
      </p>

      <div className="grid gap-3 md:grid-cols-[1fr_140px]">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${area?.id ?? "nueva"}`}>Nombre</Label>
          <Input
            id={`name-${area?.id ?? "nueva"}`}
            name="name"
            defaultValue={area?.name ?? ""}
            placeholder="Ej: Salón de fiestas"
            maxLength={60}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`cap-${area?.id ?? "nueva"}`}>Capacidad</Label>
          <Input
            id={`cap-${area?.id ?? "nueva"}`}
            name="capacity"
            defaultValue={area?.capacity ?? ""}
            inputMode="numeric"
            placeholder="Opcional"
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`desc-${area?.id ?? "nueva"}`}>Descripción</Label>
        <Input
          id={`desc-${area?.id ?? "nueva"}`}
          name="description"
          defaultValue={area?.description ?? ""}
          placeholder="Qué es y dónde queda"
          maxLength={300}
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`rules-${area?.id ?? "nueva"}`}>Reglas de uso</Label>
        <Input
          id={`rules-${area?.id ?? "nueva"}`}
          name="rules"
          defaultValue={area?.rules ?? ""}
          placeholder="Ej: dejar limpio, no música después de las 10pm"
          maxLength={1000}
          className="h-11"
        />
        <p className="text-[12px] text-mute">
          El residente las ve al reservar. Los límites de horario y anticipación se configuran
          abajo, una vez creada.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando…" : area ? "Guardar cambios" : "Crear área"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
