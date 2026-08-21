"use client";

import { useState } from "react";
import { switchViewAs } from "@/app/(super-admin)/super-admin/actions";

/**
 * Salir del modo "viendo como".
 *
 * Esto era un `<a href="/super-admin">` pelado: navegaba al panel global pero
 * nunca limpiaba `view_as` ni `organization_id` del perfil. El super_admin
 * llegaba a /super-admin todavía scopeado a un condominio, y la vista global
 * mostraba ceros — 0 condominios, 0 unidades, 0 usuarios — como si la cuenta
 * hubiera perdido todo. La única salida era que alguien editara el perfil a mano.
 *
 * `switchViewAs(null)` ya existía y hace exactamente lo que hace falta; solo
 * faltaba que alguien lo llamara.
 */
export function ExitViewAs() {
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    try {
      await switchViewAs(null);
    } finally {
      // Recarga dura y no `router.push`: el layout, la barra lateral y todas
      // las consultas del servidor dependen del perfil que acabamos de cambiar.
      window.location.href = "/super-admin";
    }
  }

  return (
    <button
      type="button"
      onClick={salir}
      disabled={saliendo}
      className="underline underline-offset-2 ml-2 disabled:opacity-60"
    >
      {saliendo ? "SALIENDO…" : "VOLVER A SUPER ADMIN"}
    </button>
  );
}
