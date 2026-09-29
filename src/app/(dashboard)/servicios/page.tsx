import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import { isAdminRole } from "@/lib/permissions";
import { CATEGORIAS_SERVICIO, NOMBRE_CATEGORIA, enlaceWhatsApp } from "@/lib/servicios";
import { AgregarServicio, RetirarServicio } from "./servicio-forms";

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id) return null;
  const { c } = await searchParams;
  const esAdmin = isAdminRole(profile);

  const supabase = await createClient();
  const { data } = await supabase
    .from("service_providers")
    .select("id, category, name, phone, whatsapp, notes, recommended_by")
    .eq("organization_id", profile.organization_id)
    .eq("active", true)
    .order("name");
  const servicios = data ?? [];

  const conProveedores = CATEGORIAS_SERVICIO.filter((cat) => servicios.some((s) => s.category === cat.id));
  const filtro = c && NOMBRE_CATEGORIA[c] ? c : null;
  const visibles = filtro ? servicios.filter((s) => s.category === filtro) : servicios;

  return (
    <div className="space-y-8">
      <div>
        <span className="font-meta-loose text-cyan-ink">SERVICIOS</span>
        <h1 className="mt-4 font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] tracking-[-0.03em] text-marine-deep">
          Técnicos de confianza del edificio
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-mute">
          Proveedores que la administración y los vecinos recomiendan. Escríbeles directo por
          WhatsApp. El condominio no los contrata ni garantiza el trabajo: acuerda precio y plazo con
          ellos.
        </p>
      </div>

      {esAdmin && (
        <div className="rounded-2xl bg-card border border-border p-6">
          <p className="font-meta text-mute mb-4">AGREGAR PROVEEDOR</p>
          <AgregarServicio />
        </div>
      )}

      {conProveedores.length > 1 && (
        <nav aria-label="Categorías" className="flex flex-wrap gap-1.5">
          <a
            href="/servicios"
            aria-current={!filtro ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
              !filtro ? "bg-marine-deep text-frost" : "border border-border text-marine-deep/70"
            }`}
          >
            Todos
          </a>
          {conProveedores.map((cat) => (
            <a
              key={cat.id}
              href={`/servicios?c=${cat.id}`}
              aria-current={filtro === cat.id ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
                filtro === cat.id ? "bg-marine-deep text-frost" : "border border-border text-marine-deep/70"
              }`}
            >
              {cat.nombre}
            </a>
          ))}
        </nav>
      )}

      {visibles.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border px-6 py-10 text-center">
          <p className="text-[15px] font-medium text-marine-deep">Todavía no hay proveedores en el directorio</p>
          <p className="mt-2 text-[14px] text-mute">
            {esAdmin
              ? "Agrega el técnico de aires, el plomero y el cerrajero que ya conocen en el edificio."
              : "Si conoces uno bueno, recomiéndaselo a la administración."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visibles.map((s) => {
            const wa = enlaceWhatsApp((s.whatsapp as string) || (s.phone as string));
            return (
              <li key={s.id as string} className="rounded-2xl bg-card border border-border p-5">
                <p className="text-[12px] font-medium text-cyan-ink">{NOMBRE_CATEGORIA[s.category as string]}</p>
                <p className="mt-1 text-[16px] font-semibold text-marine-deep">{s.name as string}</p>
                {s.notes && <p className="mt-1 text-[14px] text-mute">{s.notes as string}</p>}
                {s.recommended_by && (
                  <p className="mt-1 text-[13px] text-mute">Recomendado por {s.recommended_by as string}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-[14px] font-medium text-white hover:bg-emerald-700"
                    >
                      Escribir por WhatsApp
                    </a>
                  )}
                  {s.phone && (
                    <a
                      href={`tel:${(s.phone as string).replace(/[^\d+]/g, "")}`}
                      className="rounded-lg border border-border px-4 py-2 text-[14px] font-medium text-marine-deep"
                    >
                      Llamar
                    </a>
                  )}
                  {esAdmin && <RetirarServicio id={s.id as string} nombre={s.name as string} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
