import { redirect } from "next/navigation";
import { ExitViewAs } from "./exit-view-as";
import { createClient } from "@/lib/supabase/server";
import {
  getAuthUser,
  getCurrentProfile,
  getEffectiveRole,
  getCurrentRate,
  getOrganization,
  getPendingInvoicesForFAB,
} from "@/lib/queries";
import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Header } from "@/components/dashboard/header";
import { LiveStatusBar } from "@/components/dashboard/live-status-bar";
import { Onboarding } from "@/components/onboarding";
import { PendingPayFab } from "@/components/dashboard/pending-pay-fab";
import { ConserjeFlotante } from "@/components/conserje/conserje-flotante";
import type { AvisoFila } from "@/components/dashboard/campana";
import { modoDelConserje } from "@/lib/conserje/conserje";

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

  const effectiveRole = profile ? getEffectiveRole(profile) : "resident";
  const isAdmin = effectiveRole === "admin" || effectiveRole === "super_admin";
  const isSuperAdmin = profile?.role === "super_admin";
  const viewingAs = profile?.view_as;

  // Todo en paralelo: antes el FAB esperaba a que terminara este bloque.
  const [rateData, org, { data: avisos }, fabData] = await Promise.all([
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
    !isAdmin ? getPendingInvoicesForFAB(profile.id) : Promise.resolve(null),
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
      <Sidebar isAdmin={isAdmin} condominio={condominio} />
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
        <main className="flex-1 overflow-y-auto pb-32 md:pb-0">
          <div className="mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-10">
            {children}
          </div>
        </main>
      </div>
      {fabData && (
        <PendingPayFab
          actionable={fabData.actionable}
          inReview={fabData.inReview}
          rate={fabData.rate}
          canSeeFee={fabData.canSeeFee}
          bankAccounts={fabData.bankAccounts}
        />
      )}
      <ConserjeFlotante
        primerNombre={(profile.full_name ?? "").trim().split(/\s+/)[0] ?? ""}
        modo={modoDelConserje()}
        condominio={(org?.name as string) ?? "tu condominio"}
        fabDePago={Boolean(
          fabData?.canSeeFee && (fabData.actionable.length > 0 || fabData.inReview.length > 0),
        )}
      />
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
