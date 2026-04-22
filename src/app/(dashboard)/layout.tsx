import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getEffectiveRole } from "@/lib/queries";
import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Header } from "@/components/dashboard/header";
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

  return (
    <div className="flex h-screen">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={user.email ?? ""}
          isSuperAdmin={isSuperAdmin}
          viewingAs={viewingAs ?? null}
        />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {isSuperAdmin && viewingAs && (
            <div className={`px-4 py-1.5 text-center text-xs font-semibold text-white ${viewingAs === "admin" ? "bg-primary" : "bg-blue-600"}`}>
              Viendo como: {viewingAs === "admin" ? "Admin" : "Residente"} — <a href="/super-admin" className="underline">Volver a Super Admin</a>
            </div>
          )}
          <div className="mx-auto max-w-6xl p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
