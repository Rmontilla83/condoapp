"use client";

import { useEffect } from "react";

// Compat shim: emails viejos o configs en cache pueden apuntar a /auth/callback.
// Redirigimos client-side a /auth/confirm preservando params, para que el flujo
// de token NO se ejecute server-side (prefetch de email clients lo consumiría).
export default function CallbackRedirect() {
  useEffect(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    window.location.replace(`/auth/confirm${search}${hash}`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-frost">
      <p className="font-meta text-mute">REDIRIGIENDO...</p>
    </div>
  );
}
