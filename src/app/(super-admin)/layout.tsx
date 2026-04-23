import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AtryumLogo } from "@/components/brand/atryum-logo";
import { LiveStatusBar } from "@/components/dashboard/live-status-bar";
import { SignOutButton } from "./sign-out-button";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-frost">
      {/* Banner marine-deep con hora/tasa + contexto super-admin */}
      <div className="bg-marine-deep text-frost">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-1.5 flex items-center justify-between gap-4 flex-wrap">
          <LiveStatusBar initialRate={null} initialDate={null} />
          <div className="flex items-center gap-3 font-meta">
            <span className="text-ember hidden sm:inline">SUPER ADMIN</span>
            <span className="text-frost/50 hidden md:inline">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <header className="border-b border-border bg-frost">
        <div className="mx-auto max-w-7xl px-5 md:px-8 h-16 flex items-center justify-between">
          <Link href="/super-admin" className="flex items-center">
            <AtryumLogo variant="horizontal" tone="color" className="text-[22px]" />
          </Link>
          <nav className="flex items-center gap-1 text-[13px]">
            <Link
              href="/super-admin"
              className="px-3 py-1.5 rounded-lg text-marine-deep/70 hover:text-marine-deep hover:bg-marine/10 transition-colors"
            >
              Resumen
            </Link>
            <Link
              href="/super-admin/invitations"
              className="px-3 py-1.5 rounded-lg text-marine-deep/70 hover:text-marine-deep hover:bg-marine/10 transition-colors"
            >
              Invitaciones
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
