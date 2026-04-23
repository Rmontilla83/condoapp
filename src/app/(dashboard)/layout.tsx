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
    <div className="flex h-screen bg-background">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={user.email ?? ""}
          isSuperAdmin={isSuperAdmin}
          viewingAs={viewingAs ?? null}
        />
        {isSuperAdmin && viewingAs && (
          <div
            className={`px-5 py-2 text-center font-meta ${
              viewingAs === "admin" ? "bg-sand text-ink" : "bg-steel text-bone"
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
