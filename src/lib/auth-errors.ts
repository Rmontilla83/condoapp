/**
 * Traduce los errores de Supabase Auth a español legible.
 *
 * Vivía dentro de login/page.tsx y ahora lo usan también el formulario de
 * contraseña del perfil: dos pantallas mostrando el mismo error crudo en
 * inglés era una incoherencia visible para el usuario.
 */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  // "For security purposes, you can only request this after X seconds"
  const rateMatch = m.match(/after (\d+) seconds?/);
  if (rateMatch) {
    return `Espera ${rateMatch[1]} segundos antes de pedir otro código.`;
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Has pedido demasiados códigos. Espera unos minutos antes de intentar de nuevo.";
  }
  if (m.includes("invalid") && (m.includes("otp") || m.includes("token"))) {
    return "Código inválido o ya expiró. Pide uno nuevo.";
  }
  if (m.includes("expired")) {
    return "El código expiró. Pide uno nuevo.";
  }
  if (m.includes("signup") && m.includes("disabled")) {
    return "Este correo no tiene acceso. Pide una invitación al administrador.";
  }
  if (m.includes("nonce")) {
    return "El código no es válido o ya expiró. Pide uno nuevo.";
  }
  if (m.includes("session") && (m.includes("missing") || m.includes("expired"))) {
    return "Tu sesión expiró. Vuelve a entrar y prueba de nuevo.";
  }
  if (m.includes("password") && (m.includes("short") || m.includes("least"))) {
    return "La contraseña es demasiado corta para la política del condominio.";
  }
  if (m.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos. Si nunca creaste una contraseña, entra con el código y créala desde tu perfil.";
  }
  if (m.includes("smtp") || m.includes("email")) {
    return `Problema al enviar el correo: ${message}`;
  }
  // Por defecto, devolver el mensaje original para no ocultar info
  return message;
}
