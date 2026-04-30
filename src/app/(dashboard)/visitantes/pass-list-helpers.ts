import type { AccessPass, PassStatus } from "@/types/database";

/**
 * Calcula el status de display: si está 'active' pero el valid_until ya pasó,
 * mostramos 'expired'. Sin cron PG, este es el único lugar donde mostramos
 * pases expirados correctamente al residente.
 *
 * NOTA: Esto NO escribe el DB status='expired'. Es solo presentational.
 * Si en el futuro se agrega un cron diario, este helper se puede simplificar
 * a `pass.status` directamente.
 */
export function computeDisplayStatus(pass: Pick<AccessPass, "status" | "valid_until">): PassStatus {
  if (pass.status === "active" && new Date(pass.valid_until) < new Date()) {
    return "expired";
  }
  return pass.status;
}

/**
 * URL absoluta a `/verificar/<qrCode>`. Cliente puede pasarse `window.location.origin`,
 * server puede pasar lo que sea (ej. `process.env.NEXT_PUBLIC_PORTAL_URL`).
 */
export function buildVerifyUrl(qrCode: string, origin: string): string {
  const cleanOrigin = origin.replace(/\/$/, "");
  return `${cleanOrigin}/verificar/${qrCode}`;
}

/**
 * Mensaje WhatsApp dinámico con el nombre real del condo.
 * Reemplaza el hardcode "Residencias Los Robles".
 */
export function buildWhatsAppMessage(
  orgName: string,
  pass: Pick<AccessPass, "visitor_name">,
  url: string,
): string {
  const safeOrg = orgName?.trim() || "el condominio";
  return `Hola ${pass.visitor_name}, te dejo tu pase de visitante para ${safeOrg}. Muestra este QR al llegar: ${url}`;
}

/**
 * Ya `encodeURIComponent` lo cubre, pero centralizamos por si necesitamos
 * formato especial o tracking.
 */
export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
