"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, signOut } from "./actions";
import { useRouter } from "next/navigation";

interface Props {
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    organization_id: string | null;
  };
  orgName: string;
  unitNumber: string;
}

export function ProfileForm({ profile, orgName, unitNumber }: Props) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);
    const res = await updateProfile(new FormData(e.currentTarget));
    if (res.error) { setError(res.error); setLoading(false); return; }
    setSaved(true);
    setLoading(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    super_admin: "Super Admin",
    resident: "Residente",
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nombre completo</Label>
          <Input id="full_name" name="full_name" defaultValue={profile.full_name} required />
        </div>
        <div className="space-y-2">
          <Label>Correo electronico</Label>
          <Input value={profile.email} disabled className="opacity-60" />
          <p className="text-xs text-muted-foreground">No se puede cambiar — es tu metodo de acceso</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefono</Label>
          <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} placeholder="+58 412 1234567" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
        </Button>
      </form>

      <div className="rounded-xl border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Info de cuenta</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Rol</p>
            <p className="font-medium">{roleLabels[profile.role] ?? profile.role}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Condominio</p>
            <p className="font-medium">{orgName}</p>
          </div>
          {unitNumber && (
            <div>
              <p className="text-muted-foreground">Unidad</p>
              <p className="font-medium">Apto {unitNumber}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">ID organizacion</p>
            <p className="font-mono text-xs text-muted-foreground break-all">{profile.organization_id}</p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t">
        <Button variant="outline" onClick={handleSignOut} className="text-red-600 border-red-200 hover:bg-red-50">
          Cerrar sesion
        </Button>
      </div>
    </div>
  );
}
