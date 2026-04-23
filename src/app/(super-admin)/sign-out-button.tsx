"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="px-3 py-1.5 rounded-lg text-mute hover:text-destructive hover:bg-destructive/5 transition-colors text-[13px]"
    >
      Salir
    </button>
  );
}
