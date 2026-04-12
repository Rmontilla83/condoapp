const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export function validateText(value: string | null, field: string, maxLength = 500): string | null {
  if (!value || !value.trim()) return `${field} es requerido`;
  if (value.trim().length > maxLength) return `${field} es demasiado largo (max ${maxLength} caracteres)`;
  return null;
}

export function validateAmount(value: number): string | null {
  if (!value || isNaN(value)) return "Monto invalido";
  if (value < 0.01) return "El monto debe ser mayor a 0";
  if (value > 999999.99) return "El monto es demasiado alto";
  return null;
}

export function validateFile(file: File | null): { valid: boolean; error?: string } {
  if (!file || file.size === 0) return { valid: true }; // Optional file

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Archivo muy grande (max 5MB)" };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: "Solo se permiten imagenes JPG, PNG o WebP" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: "Extension de archivo no permitida" };
  }

  return { valid: true };
}

export function safeFilename(orgId: string, ext: string): string {
  const safeExt = ALLOWED_EXTENSIONS.includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
  return `${orgId}/${crypto.randomUUID()}.${safeExt}`;
}

export function safeError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    if (code === "23505") return "Este registro ya existe";
    if (code === "23503") return "Referencia invalida";
    if (code === "42501") return "No tienes permiso para esta accion";
  }
  return "Error al procesar la solicitud. Intenta de nuevo.";
}
