"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { translateAuthError } from "@/lib/auth-errors";

const MIN_LENGTH = 10;

/**
 * Crear o cambiar la contraseña de acceso.
 *
 * La app entra por código al correo, que es lo correcto para un residente que
 * abre dos veces al mes. Pero quien entra todo el tiempo —administradores,
 * pruebas— no quiere esperar un correo cada vez.
 *
 * POR QUÉ SON DOS PASOS
 *
 * `auth.updateUser({ password })` a secas, sobre la sesión ya abierta, convertía
 * una sesión robada en una toma permanente de la cuenta: hoy una sesión robada
 * caduca y el atacante necesita el buzón de la víctima para volver a entrar;
 * con un cambio de contraseña sin más, se pondría una clave y entraría cuando
 * quisiera, para siempre.
 *
 * `reauthenticate()` manda un código de 6 dígitos al correo y `updateUser` lo
 * exige como `nonce`. Así crear la contraseña sigue costando acceso al buzón,
 * exactamente igual que entrar por OTP. Tener la sesión no alcanza.
 */
export function PasswordForm({ email }: { email: string }) {
  const [paso, setPaso] = useState<"inicio" | "codigo">("inicio");
  const [nonce, setNonce] = useState("");
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const suficiente = password.length >= MIN_LENGTH;
  const coinciden = password.length > 0 && password === repetir;

  function limpiar() {
    setPassword("");
    setRepetir("");
    setNonce("");
  }

  async function pedirCodigo() {
    setLoading(true);
    setError("");
    setOk(false);
    const supabase = createClient();
    const { error: reauthError } = await supabase.auth.reauthenticate();
    setLoading(false);
    if (reauthError) {
      setError(translateAuthError(reauthError.message));
      return;
    }
    setPaso("codigo");
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk(false);

    if (nonce.trim().length < 6) {
      setError("Escribe el código de 6 dígitos que te llegó por correo.");
      return;
    }
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
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      nonce: nonce.trim(),
    });
    setLoading(false);

    if (updateError) {
      setError(translateAuthError(updateError.message));
      return;
    }

    limpiar();
    setPaso("inicio");
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

      {ok && (
        <p className="mt-4 rounded-md border border-cyan/40 bg-cyan/5 px-3 py-2 text-[13px] text-marine-deep">
          Listo. Ya puedes entrar con tu correo y esta contraseña desde{" "}
          <strong>Entrar con contraseña</strong> en la pantalla de acceso.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
        >
          {error}
        </p>
      )}

      {paso === "inicio" ? (
        <div className="mt-5 space-y-3 max-w-md">
          <p className="text-[13px] text-mute">
            Por seguridad te mandamos un código a <strong>{email}</strong> antes de cambiarla.
            Así, aunque alguien se quede con tu sesión abierta, no puede ponerte una contraseña.
          </p>
          <Button type="button" onClick={pedirCodigo} disabled={loading}>
            {loading ? "Enviando…" : "Enviar código para crear o cambiar la contraseña"}
          </Button>
        </div>
      ) : (
        <form onSubmit={guardar} className="mt-5 space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="nonce-pwd">Código que te llegó por correo</Label>
            <Input
              id="nonce-pwd"
              value={nonce}
              onChange={(e) => {
                setNonce(e.target.value);
                setError("");
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6 dígitos"
              className="h-11 font-mono tracking-widest"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nueva-pwd">Nueva contraseña</Label>
            <Input
              id="nueva-pwd"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
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
              }}
              autoComplete="new-password"
              className="h-11"
            />
            {repetir.length > 0 && !coinciden && (
              <p className="text-[12px] text-destructive">No coinciden.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={loading || !suficiente || !coinciden}>
              {loading ? "Guardando…" : "Guardar contraseña"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                limpiar();
                setError("");
                setPaso("inicio");
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>

          <p className="text-[12px] text-mute">
            Al cambiarla, tus otras sesiones se cierran. Vas a tener que volver a entrar en los
            demás dispositivos.
          </p>
        </form>
      )}
    </div>
  );
}
