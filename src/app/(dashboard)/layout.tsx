import { redirect } from "next/navigation";
import { ExitViewAs } from "./exit-view-as";
import { createClient } from "@/lib/supabase/server";
import {
  getAuthUser,
  getCurrentProfile,
  getEffectiveRole,
  getCurrentRate,
  getOrganization,
} from "@/lib/queries";
import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { pendientesDelMenu } from "@/lib/pendientes-menu";
import { Header } from "@/components/dashboard/header";
import { LiveStatusBar } from "@/components/dashboard/live-status-bar";
import { Onboarding } from "@/components/onboarding";
import { ConserjeFlotante } from "@/components/conserje/conserje-flotante";
import type { AvisoFila } from "@/components/dashboard/campana";
import { modoDelConserje } from "@/lib/conserje/conserje";
import { VERSION_CONDICIONES } from "@/lib/legal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getAuthUser y getCurrentProfile están en cache(): la página que se pinta
  // debajo reusa estas mismas respuestas en vez de volver a pedirlas.
  const [user, profile] = await Promise.all([getAuthUser(), getCurrentProfile()]);

  if (!user) redirect("/login");
  const supabase = await createClient();

  if (profile?.role === "super_admin" && !profile.organization_id) {
    redirect("/super-admin");
  }

  if (!profile?.organization_id) {
    return <Onboarding userEmail={user.email ?? ""} />;
  }

  // Cada persona acepta las condiciones al entrar. El equipo de Atryum no pasa
  // por aquí: entra a dar soporte, no como usuario del condominio.
  // Redirige en vez de pintar la pantalla aquí: un return del layout no impide que
  // Next envíe la página de abajo en la respuesta.
  if (profile.role !== "super_admin" && profile.terms_version !== VERSION_CONDICIONES) {
    redirect("/aceptar-condiciones");
  }

  const effectiveRole = profile ? getEffectiveRole(profile) : "resident";
  const isAdmin = effectiveRole === "admin" || effectiveRole === "super_admin";
  const isSuperAdmin = profile?.role === "super_admin";
  const viewingAs = profile?.view_as;

  // Todo en paralelo: antes el FAB esperaba a que terminara este bloque.
  const [rateData, org, { data: avisos }, , pendientes] = await Promise.all([
    getCurrentRate(profile.organization_id),
    getOrganization(profile.organization_id),
    // Los propios, por RLS (migration 046).
    supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    // FAB de pago pendiente: solo para residentes (los admins ven su panel).
    // La barra flotante de pago se retiró: el botón «Pagar» está en el inicio.
    Promise.resolve(null),
    // Burbujas del menú: solo para quien está viendo como administración.
    isAdmin ? pendientesDelMenu(profile, profile.organization_id) : Promise.resolve({}),
  ]);
  const initialRate = Number(rateData.rate) || null;
  const initialDate = rateData.effective_date || null;

  const condominio = org
    ? {
        nombre: org.name as string,
        ciudad: (org.city as string) || null,
        logoUrl: (org.logo_url as string) || null,
        logoOscuroUrl: (org.logo_dark_url as string) || null,
        logoCompactoUrl: (org.logo_compact_url as string) || null,
      }
    : null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isAdmin={isAdmin} condominio={condominio} pendientes={pendientes} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Cintillo live: hora Venezuela + tasa BCV actualizada.
            data-print-hide: la constancia de pago se imprime, y la tasa de HOY
            arriba de un comprobante de hace tres meses es engañosa. */}
        <div data-print-hide className="bg-marine-deep text-frost border-b border-frost/5">
          <div className="px-4 md:px-6 py-1.5 flex items-center justify-between">
            <LiveStatusBar initialRate={initialRate} initialDate={initialDate} />
            <span className="font-meta text-frost/30 hidden sm:inline">ATRYUM</span>
          </div>
        </div>
        <Header
          userEmail={user.email ?? ""}
          isSuperAdmin={isSuperAdmin}
          viewingAs={viewingAs ?? null}
          condominio={condominio}
          avisos={(avisos ?? []) as AvisoFila[]}
          menuMovil={!isAdmin}
        />
        {isSuperAdmin && viewingAs && (
          <div
            data-print-hide
            className={`px-5 py-2 text-center font-meta ${
              viewingAs === "admin" ? "bg-ember text-marine-deep" : "bg-cyan text-frost"
            }`}
          >
            VIENDO COMO · {viewingAs === "admin" ? "ADMIN" : "RESIDENTE"}{" "}
            <ExitViewAs />
          </div>
        )}
        {/* El residente ya no tiene barra inferior en el teléfono: no hace falta el hueco. */}
        <main data-zona={isAdmin ? "admin" : undefined} className={`flex-1 overflow-y-auto md:pb-0 ${isAdmin ? "pb-32" : "pb-6"}`}>
          <div className="mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-10">
            {children}
          </div>
        </main>
      </div>
      <ConserjeFlotante
        primerNombre={(profile.full_name ?? "").trim().split(/\s+/)[0] ?? ""}
        modo={modoDelConserje()}
        condominio={(org?.name as string) ?? "tu condominio"}
        fabDePago={false}
        soloEscritorio={!isAdmin}
        oculto={isAdmin}
      />
      {/* En el teléfono, el residente navega con el botón «Menú» del encabezado. */}
      {isAdmin && <BottomNav isAdmin={isAdmin} pendientes={pendientes} />}
    </div>
  );
}
