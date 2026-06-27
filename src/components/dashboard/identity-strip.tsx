import Link from "next/link";
import type { DashboardContext } from "@/lib/queries";

const UNIT_TYPE_LABELS: Record<string, string> = {
  apartment: "APTO",
  house: "CASA",
  penthouse: "PH",
  local: "LOCAL",
  office: "OFICINA",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "PROPIETARIO",
  tenant: "INQUILINO",
};

function getGreeting(timezone?: string | null): string {
  // Server Component: new Date().getHours() usaría la hora del servidor (UTC).
  // Calculamos la hora en la zona del condominio (default Venezuela).
  const tz = timezone || "America/Caracas";
  let hour: number;
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: tz,
      }).format(new Date()),
    );
  } catch {
    hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: "America/Caracas",
      }).format(new Date()),
    );
  }
  if (hour < 12) return "BUENOS DÍAS";
  if (hour < 19) return "BUENAS TARDES";
  return "BUENAS NOCHES";
}

export function IdentityStrip({ ctx }: { ctx: DashboardContext }) {
  const firstName = (ctx.profile.full_name || "vecino").split(" ")[0];
  const m = ctx.primaryMembership;
  const extraCount = ctx.memberships.length - 1;

  const chipParts: string[] = [];
  if (m) {
    const typeLabel = UNIT_TYPE_LABELS[m.unit.type] ?? "UNIDAD";
    chipParts.push(`${typeLabel} ${m.unit.unit_number}`);
    if (m.unit.block) chipParts.push(m.unit.block.toUpperCase());
  }
  if (ctx.org?.name) chipParts.push(ctx.org.name.toUpperCase());
  if (m) chipParts.push(ROLE_LABELS[m.role] ?? m.role.toUpperCase());

  return (
    <div className="space-y-3">
      {chipParts.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-marine-deep/5 border border-marine-deep/10 px-3 py-1.5 font-meta text-marine-deep">
            {chipParts.join(" · ")}
          </span>
          {extraCount > 0 && (
            <Link
              href="/mi-unidad"
              className="font-meta text-cyan hover:text-marine-deep transition-colors"
            >
              + {extraCount} UNIDAD{extraCount > 1 ? "ES" : ""} MÁS →
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 font-meta text-amber-800">
          ACCESO LIMITADO · CONTACTA AL ADMINISTRADOR PARA ASIGNAR TU UNIDAD
        </div>
      )}

      <div>
        <span className="font-meta-loose text-cyan">{getGreeting(ctx.org?.timezone)}</span>
        <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] tracking-[-0.035em] text-marine-deep">
          <em className="font-editorial">{firstName}</em>
        </h1>
        <p className="mt-3 text-[15px] text-mute">
          Aquí está lo que pasa hoy en tu comunidad.
        </p>
      </div>
    </div>
  );
}
