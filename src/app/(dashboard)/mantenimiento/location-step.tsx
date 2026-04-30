"use client";

import type { CommonArea } from "@/types/database";

export interface LocationSelection {
  kind: "unit" | "common";
  unitId?: string;
  unitLabel?: string;
  commonAreaId?: string;
  commonAreaName?: string;
}

export interface UnitOption {
  id: string;
  label: string; // ej: "APTO 1-A · TORRE NORTE"
}

export function LocationStep({
  units,
  commonAreas,
  onSelect,
}: {
  units: UnitOption[];
  commonAreas: CommonArea[];
  onSelect: (loc: LocationSelection) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[14px] text-marine-deep/80">¿Dónde está el problema?</p>

      <div className="grid grid-cols-1 gap-2">
        {units.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() =>
              onSelect({
                kind: "unit",
                unitId: u.id,
                unitLabel: u.label,
              })
            }
            className="text-left rounded-lg border border-border p-4 hover:border-cyan hover:bg-cyan/5 transition flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan/10 text-cyan shrink-0">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12l8.954-8.955a1.5 1.5 0 012.12 0L22.28 12M4.5 9.75v10.125a1.125 1.125 0 001.125 1.125h3.375v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h3.375a1.125 1.125 0 001.125-1.125V9.75M8.25 21h7.5"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-meta text-mute">MI UNIDAD</p>
              <p className="text-[14px] font-medium text-marine-deep truncate">{u.label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="pt-2">
        <p className="font-meta text-mute mb-2">¿O es un área común?</p>
        {commonAreas.length === 0 ? (
          <p className="text-[12px] text-mute italic">
            Tu condominio no tiene áreas comunes registradas.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {commonAreas.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  onSelect({
                    kind: "common",
                    commonAreaId: c.id,
                    commonAreaName: c.name,
                  })
                }
                className="text-left rounded-lg border border-border p-3 hover:border-ember hover:bg-ember/5 transition"
              >
                <p className="font-meta text-mute">ÁREA COMÚN</p>
                <p className="mt-1 text-[13px] font-medium text-marine-deep truncate">
                  {c.name}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
