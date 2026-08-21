"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_LENGTH = 10;

/**
 * Crear o cambiar la contraseña de acceso.
 *
 * La app entra por código al correo, que es lo correcto para un residente que
 * abre dos veces al mes. Pero quien entra todo el tiempo —administradores,
 * pruebas— no quiere esperar un correo cada vez.
 *
 * La contraseña la escribe cada persona acá, sobre su propia sesión ya
 * autenticada (`auth.updateUser`). Nadie se la asigna a nadie, y nunca viaja
 * por otro canal.
 */
export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const suficiente = password.length >= MIN_LENGTH;
  const coinciden = password.length > 0 && password === repetir;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk(false);

    if (!suficiente) {
      setError(`La contraseña necesita al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (!coinciden) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPassword("");
    setRepetir("");
    setOk(true);
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <p className="font-meta text-mute">CONTRASEÑA DE ACCESO</p>
      <p className="mt-2 text-[15px] font-medium text-marine-deep">
        Entra sin esperar el código
      </p>
      <p className="mt-1 text-[13px] text-mute max-w-xl">
        Opcional. Si creas una contraseña, vas a poder entrar con tu correo y esa clave desde la
        pantalla de acceso. El código por correo sigue funcionando igual.
      </p>

      <form onSubmit={guardar} className="mt-5 space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="nueva-pwd">Nueva contraseña</Label>
          <Input
            id="nueva-pwd"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
              setOk(false);
            }}
            autoComplete="new-password"
            className="h-11"
          />
          <p className={`text-[12px] ${suficiente ? "text-mute" : "text-ember-ink"}`}>
            Mínimo {MIN_LENGTH} caracteres.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="repetir-pwd">Repítela</Label>
          <Input
            id="repetir-pwd"
            type="password"
            value={repetir}
            onChange={(e) => {
              setRepetir(e.target.value);
              setError("");
              setOk(false);
            }}
            autoComplete="new-password"
            className="h-11"
          />
          {repetir.length > 0 && !coinciden && (
            <p className="text-[12px] text-destructive">No coinciden.</p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
          >
            {error}
          </p>
        )}

        {ok && (
          <p className="rounded-md border border-cyan/40 bg-cyan/5 px-3 py-2 text-[13px] text-marine-deep">
            Listo. Ya puedes entrar con tu correo y esta contraseña desde{" "}
            <strong>Entrar con contraseña</strong> en la pantalla de acceso.
          </p>
        )}

        <Button type="submit" disabled={loading || !suficiente || !coinciden}>
          {loading ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </div>
  );
}
