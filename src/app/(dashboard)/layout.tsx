import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getEffectiveRole, getCurrentRate } from "@/lib/queries";
import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Header } from "@/components/dashboard/header";
import { LiveStatusBar } from "@/components/dashboard/live-status-bar";
import { Onboarding } from "@/components/onboarding";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();

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

  // Tasa inicial desde BD para evitar flash "—" al primer render.
  const rateData = await getCurrentRate(profile.organization_id);
  const initialRate = Number(rateData.rate) || null;
  const initialDate = rateData.effective_date || null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Cintillo live: hora Venezuela + tasa BCV actualizada */}
        <div className="bg-marine-deep text-frost border-b border-frost/5">
          <div className="px-4 md:px-6 py-1.5 flex items-center justify-between">
            <LiveStatusBar initialRate={initialRate} initialDate={initialDate} />
            <span className="font-meta text-frost/30 hidden sm:inline">ATRYUM</span>
          </div>
        </div>
        <Header
          userEmail={user.email ?? ""}
          isSuperAdmin={isSuperAdmin}
          viewingAs={viewingAs ?? null}
        />
        {isSuperAdmin && viewingAs && (
          <div
            className={`px-5 py-2 text-center font-meta ${
              viewingAs === "admin" ? "bg-ember text-marine-deep" : "bg-cyan text-frost"
            }`}
          >
            VIENDO COMO · {viewingAs === "admin" ? "ADMIN" : "RESIDENTE"}{" "}
            <a href="/super-admin" className="underline underline-offset-2 ml-2">
              VOLVER A SUPER ADMIN
            </a>
          </div>
        )}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-10">
            {children}
          </div>
        </main>
      </div>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
