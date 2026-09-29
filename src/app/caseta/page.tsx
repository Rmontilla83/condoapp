import type { Metadata } from "next";
import Link from "next/link";
import { AtryumLogo } from "@/components/brand/atryum-logo";
import { casetaActual } from "@/lib/caseta";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TIME_ZONE, todayInTimeZone, zonedToISO } from "@/lib/utils";
import { VISITOR_KIND_BY_ID } from "@/app/(dashboard)/visitantes/visitor-kinds";
import type { VisitorKind } from "@/types/database";
import { RegistrarEntrada } from "./registrar-entrada";
import { Paquetes } from "./paquetes";
import { compararUnidades } from "@/lib/units/orden";

export const metadata: Metadata = { title: "Caseta · Atryum" };
export const dynamic = "force-dynamic";

/**
 * Pantalla de la garita. Sin sesión: la identidad es la cookie de caseta.
 * Muestra quién se espera hoy, permite buscar por nombre o cédula y registrar la
 * entrada sin QR, y lista las entradas del día.
 */
export default async function CasetaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; enlace?: string }>;
}) {
  const { q, enlace } = await searchParams;
  const caseta = await casetaActual();

  if (!caseta) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-meta text-ember-ink">
            {enlace === "invalido" ? "ENLACE NO VÁLIDO" : "ESTE DISPOSITIVO NO ES UNA CASETA"}
          </p>
          <p className="mt-3 text-[15px] text-marine-deep">
            {enlace === "invalido"
              ? "El enlace de la caseta fue revocado o está incompleto."
              : "Para usar este teléfono en la garita, abre el enlace de caseta que te dio la administración."}
          </p>
          <p className="mt-2 text-[14px] text-mute">
            La administración lo genera en Configuración → Caseta de vigilancia.
          </p>
        </div>
      </Shell>
    );
  }

  const db = createAdminClient();
  const { data: org } = await db
    .from("organizations")
    .select("name, timezone")
    .eq("id", caseta.organization_id)
    .single();
  const zona = (org?.timezone as string) || DEFAULT_TIME_ZONE;
  const hoy = todayInTimeZone(zona);
  const inicioHoy = zonedToISO(hoy, "00:00", zona);
  const finHoy = new Date(Date.parse(zonedToISO(hoy, "23:59", zona)) + 60_000).toISOString();
  const ahora = new Date().toISOString();

  const [{ data: pases }, { data: entradas }, { data: paquetes }, { data: unidades }] = await Promise.all([
    db
      .from("access_passes")
      .select("id, visitor_name, visitor_id_number, visitor_kind, vehicle_plate, valid_from, valid_until, units:unit_id(unit_number, block), profiles:created_by(full_name)")
      .eq("organization_id", caseta.organization_id)
      .eq("status", "active")
      .gt("valid_until", ahora)
      .lt("valid_from", finHoy)
      .order("valid_from")
      .limit(200),
    db
      .from("access_logs")
      .select("id, scanned_at, station_id, access_passes!inner(visitor_name, organization_id, units:unit_id(unit_number, block))")
      .eq("access_passes.organization_id", caseta.organization_id)
      .gte("scanned_at", inicioHoy)
      .order("scanned_at", { ascending: false })
      .limit(50),
    db
      .from("packages")
      .select("id, description, carrier, recipient_name, received_at, units:unit_id(unit_number, block)")
      .eq("organization_id", caseta.organization_id)
      .eq("status", "waiting")
      .order("received_at", { ascending: false })
      .limit(100),
    db.from("units").select("id, unit_number, block").eq("organization_id", caseta.organization_id),
  ]);

  type Unidad = { unit_number: string; block: string | null } | null;
  const destino = (u: Unidad | Unidad[]) => {
    const x = Array.isArray(u) ? u[0] : u;
    return x ? `Apto ${x.unit_number}${x.block ? ` · ${x.block}` : ""}` : "Área común";
  };
  const hora = (iso: string) =>
    new Intl.DateTimeFormat("es-VE", { timeZone: zona, hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(iso));

  const buscar = (q ?? "").trim().toLowerCase();
  const esperados = (pases ?? []).filter(
    (p) =>
      !buscar ||
      (p.visitor_name as string).toLowerCase().includes(buscar) ||
      ((p.visitor_id_number as string) ?? "").toLowerCase().includes(buscar) ||
      ((p.vehicle_plate as string) ?? "").toLowerCase().includes(buscar) ||
      destino(p.units as unknown as Unidad).toLowerCase().includes(buscar),
  );

  return (
    <Shell>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-meta text-cyan-ink">CASETA · {caseta.name.toUpperCase()}</p>
          <h1 className="mt-1 font-display text-[26px] leading-tight text-marine-deep truncate">{org?.name}</h1>
        </div>
        <Link href="/caseta" className="shrink-0 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-marine-deep">
          Actualizar
        </Link>
      </div>

      <div className="rounded-2xl bg-marine-deep p-4 text-frost">
        <p className="font-meta text-cyan">CON QR</p>
        <p className="mt-1 text-[14px] text-frost/85">
          Abre la cámara de este teléfono y apunta al QR del visitante. Se abre el pase con el botón
          «Permitir acceso».
        </p>
      </div>

      <form className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Buscar visitante
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Nombre, cédula, placa o apto…"
          className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-base focus-visible:outline-2 focus-visible:outline-cyan"
        />
        <button className="h-12 rounded-xl bg-marine-deep px-5 text-[15px] font-medium text-frost">Buscar</button>
      </form>

      <section>
        <p className="font-meta text-mute mb-2">
          ESPERADOS HOY · {esperados.length}
          {buscar && ` · FILTRO «${q}»`}
        </p>
        {esperados.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-5 text-center text-[14px] text-mute">
            {buscar ? "Nadie coincide con la búsqueda." : "No hay visitas anunciadas para hoy."}
          </p>
        ) : (
          <ul className="space-y-2">
            {esperados.map((p) => {
              const kind = VISITOR_KIND_BY_ID[(p.visitor_kind as VisitorKind) ?? "guest"] ?? VISITOR_KIND_BY_ID.guest;
              const invita = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
              return (
                <li key={p.id as string} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-semibold text-marine-deep">{p.visitor_name as string}</p>
                      <p className="font-mono text-[13px] text-mute">{(p.visitor_id_number as string) || "Sin cédula"}</p>
                      <p className="mt-1 text-[13px] text-marine-deep">
                        {destino(p.units as unknown as Unidad)}
                        {(invita as { full_name?: string } | null)?.full_name
                          ? ` · invita ${(invita as { full_name?: string }).full_name}`
                          : ""}
                      </p>
                      <p className="font-meta text-mute">
                        {kind.label.toUpperCase()}
                        {p.vehicle_plate ? ` · PLACA ${p.vehicle_plate}` : ""}
                        {` · HASTA ${hora(p.valid_until as string)}`}
                      </p>
                    </div>
                  </div>
                  <RegistrarEntrada passId={p.id as string} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Paquetes
        paquetes={(paquetes ?? []).map((p) => ({
          id: p.id as string,
          description: p.description as string,
          carrier: (p.carrier as string) ?? null,
          recipient_name: (p.recipient_name as string) ?? null,
          destino: destino(p.units as unknown as Unidad),
          recibido: new Intl.DateTimeFormat("es-VE", { timeZone: zona, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(p.received_at as string)),
        }))}
        unidades={[...(unidades ?? [])]
          .sort((a, b) =>
            compararUnidades(
              { unit_number: a.unit_number as string, block: a.block as string | null },
              { unit_number: b.unit_number as string, block: b.block as string | null },
            ),
          )
          .map((u) => ({
            id: u.id as string,
            etiqueta: `Apto ${u.unit_number as string}${u.block ? ` · ${u.block as string}` : ""}`,
            torre: (u.block as string) ?? null,
          }))}
      />

      <section>
        <p className="font-meta text-mute mb-2">ENTRADAS DE HOY · {(entradas ?? []).length}</p>
        {(entradas ?? []).length === 0 ? (
          <p className="text-[14px] text-mute">Todavía no se registró ninguna entrada hoy.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {(entradas ?? []).map((e) => {
              const pase = (Array.isArray(e.access_passes) ? e.access_passes[0] : e.access_passes) as {
                visitor_name: string;
                units: Unidad | Unidad[];
              };
              return (
                <li key={e.id as string} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                  <span className="min-w-0 truncate text-marine-deep">
                    {pase?.visitor_name} <span className="text-mute">· {destino(pase?.units ?? null)}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[13px] text-mute">{hora(e.scanned_at as string)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-frost">
      <header className="px-5 py-5">
        <AtryumLogo variant="horizontal" tone="color" className="text-[20px]" />
      </header>
      <main className="mx-auto max-w-xl space-y-5 px-4 pb-16">{children}</main>
    </div>
  );
}
