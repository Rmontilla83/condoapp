import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AtryumLogo } from "@/components/brand/atryum-logo";
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
    <div className="min-h-screen flex flex-col bg-bone">
      {/* Banner ink */}
      <div className="bg-ink text-bone">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-2 flex items-center justify-between">
          <span className="font-meta text-sand">SUPER ADMIN · PLATAFORMA ATRYUM</span>
          <span className="font-meta text-bone/50 hidden sm:inline">{user.email}</span>
        </div>
      </div>

      {/* Nav */}
      <header className="border-b border-border bg-bone">
        <div className="mx-auto max-w-7xl px-5 md:px-8 h-16 flex items-center justify-between">
          <Link href="/super-admin" className="flex items-center">
            <AtryumLogo variant="horizontal" tone="ink" className="h-6" />
          </Link>
          <nav className="flex items-center gap-1 text-[13px]">
            <Link
              href="/super-admin"
              className="px-3 py-1.5 rounded-lg text-ink/70 hover:text-ink hover:bg-ink/[0.04] transition-colors"
            >
              Resumen
            </Link>
            <Link
              href="/super-admin/invitations"
              className="px-3 py-1.5 rounded-lg text-ink/70 hover:text-ink hover:bg-ink/[0.04] transition-colors"
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
