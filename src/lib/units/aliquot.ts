/**
 * Reglas de la alícuota.
 *
 * Módulo NEUTRO a propósito (sin `"use server"`): lo consumen el editor cliente
 * y la server action. Un archivo con `"use server"` solo puede exportar
 * funciones async; exportar constantes desde ahí las convierte en referencias a
 * server action y revienta en el navegador.
 *
 * Qué es una alícuota: la fracción de propiedad de cada unidad sobre el
 * condominio. Sale del documento de condominio protocolizado — el administrador
 * la **transcribe**, no la inventa. Por eso el sistema nunca exige que sume
 * 100%: la realidad viene sucia (en producción Costa suma 106,20% y Olivos
 * 113,00%) y `distributeExact()` ya reparte proporcional a la suma real
 * garantizando que el total cobrado sea exacto al centavo.
 */

import { distributeExact } from "@/lib/cobranza/compute-invoices";

/** La columna es NUMERIC(7,4): más decimales los truncaría Postgres en silencio. */
export const ALIQUOT_MAX_DECIMALS = 4;

/** Tolerancia para considerar que "cuadra en 100". */
export const ALIQUOT_SUM_EPSILON = 0.01;

/** A partir de acá el desvío deja de ser un redondeo y pide confirmación. */
export const ALIQUOT_SUM_WARN_POINTS = 5;

/** Sobre este número de unidades, editar desde el teléfono es hostil. */
export const ALIQUOT_DESKTOP_HINT_UNITS = 15;

export interface AliquotRow {
  id: string;
  unit_number: string;
  aliquot: number | null;
}

export type ParseResult =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

/**
 * Interpreta lo que el admin tecleó.
 *
 * Tolera la coma decimal (que es lo natural en LatAm) y un `%` pegado, porque
 * es lo que sale de copiar y pegar del documento de condominio.
 * Vacío significa "sin configurar" (NULL), que NO es lo mismo que 0.
 */
export function parseAliquotInput(raw: string | null | undefined): ParseResult {
  const texto = (raw ?? "").trim().replace(/\s/g, "").replace(/%$/, "");
  if (texto === "") return { ok: true, value: null };

  // Coma decimal -> punto. Si vienen las dos, asumimos que la coma es separador
  // de miles y la descartamos (una alícuota nunca llega a 1.000).
  const normalizado = texto.includes(",") && texto.includes(".")
    ? texto.replace(/,/g, "")
    : texto.replace(",", ".");

  if (!/^\d*\.?\d*$/.test(normalizado)) {
    return { ok: false, error: "Solo números (por ejemplo 6,5 o 6.5)" };
  }

  const valor = Number(normalizado);
  if (!Number.isFinite(valor)) return { ok: false, error: "Número inválido" };
  if (valor < 0) return { ok: false, error: "No puede ser negativa" };
  if (valor > 100) return { ok: false, error: "No puede pasar de 100%" };

  const decimales = normalizado.split(".")[1]?.length ?? 0;
  if (decimales > ALIQUOT_MAX_DECIMALS) {
    // Se rechaza en vez de redondear: Postgres lo truncaría en silencio y el
    // admin nunca se enteraría de que guardó algo distinto de lo que escribió.
    return { ok: false, error: `Máximo ${ALIQUOT_MAX_DECIMALS} decimales` };
  }

  return { ok: true, value: valor };
}

/** Suma de las alícuotas configuradas. Las NULL no suman. */
export function sumAliquots(rows: Array<{ aliquot: number | null }>): number {
  const total = rows.reduce((s, r) => s + (r.aliquot ?? 0), 0);
  // Evita el clásico 106.19999999999999 al mostrarlo.
  return Math.round(total * 10 ** ALIQUOT_MAX_DECIMALS) / 10 ** ALIQUOT_MAX_DECIMALS;
}

export interface AliquotCoverage {
  totalUnits: number;
  /** Unidades con un valor cargado (incluye las exentas en 0). */
  configured: number;
  /** Exentas por decisión. */
  atZero: number;
  /** Todavía sin cargar. */
  unset: number;
  sum: number;
}

export function computeCoverage(rows: Array<{ aliquot: number | null }>): AliquotCoverage {
  return {
    totalUnits: rows.length,
    configured: rows.filter((r) => r.aliquot !== null).length,
    atZero: rows.filter((r) => r.aliquot === 0).length,
    unset: rows.filter((r) => r.aliquot === null).length,
    sum: sumAliquots(rows),
  };
}

export type AliquotTone = "ok" | "warn" | "danger";

export interface AliquotStatus {
  tone: AliquotTone;
  label: string;
  detail: string;
  /** true si conviene pedirle al admin una confirmación deliberada al guardar. */
  needsConfirm: boolean;
}

/**
 * El semáforo de la hoja. Nunca bloquea: informa.
 */
export function aliquotStatus(cov: AliquotCoverage): AliquotStatus {
  if (cov.totalUnits === 0) {
    return {
      tone: "danger",
      label: "SIN UNIDADES",
      detail: "Agrega las unidades del condominio antes de cargar alícuotas.",
      needsConfirm: false,
    };
  }

  if (cov.configured === 0 || cov.sum <= 0) {
    return {
      tone: "danger",
      label: "SIN ALÍCUOTAS",
      detail:
        "Mientras estén vacías, el cobro por alícuota y el voto ponderado no funcionan.",
      needsConfirm: false,
    };
  }

  const desvio = cov.sum - 100;
  const pendientes =
    cov.unset > 0
      ? ` Faltan ${cov.unset} unidad${cov.unset !== 1 ? "es" : ""} por cargar.`
      : "";

  if (Math.abs(desvio) <= ALIQUOT_SUM_EPSILON) {
    return {
      tone: cov.unset > 0 ? "warn" : "ok",
      label: "CUADRA EN 100%",
      detail: pendientes.trim() || "Las alícuotas suman exactamente 100%.",
      needsConfirm: false,
    };
  }

  const signo = desvio > 0 ? "sobran" : "faltan";
  const magnitud = Math.abs(desvio).toFixed(2).replace(".", ",");
  const grande = Math.abs(desvio) > ALIQUOT_SUM_WARN_POINTS;

  return {
    tone: "warn",
    label: `SUMA ${cov.sum.toFixed(2).replace(".", ",")}% · ${signo.toUpperCase()} ${magnitud}%`,
    detail:
      "Igual puedes cobrar: el reparto es proporcional y el total cobrado siempre da exacto." +
      pendientes,
    needsConfirm: grande,
  };
}

/**
 * Semilla: reparte 100% en partes iguales.
 *
 * Se apoya en `distributeExact` —la misma función que reparte el dinero— para
 * que el criterio de residuo sea uno solo en todo el sistema. Si el editor
 * repartiera con su propia regla, las alícuotas semilla podrían no cuadrar con
 * el reparto real de las cuotas.
 */
export function seedEqual(ids: string[]): Map<string, number> {
  return distributeExact(100, ids.map((id) => ({ id, w: 1 })), ALIQUOT_MAX_DECIMALS);
}

/**
 * Semilla: reescala lo ya cargado para que sume 100%, conservando las
 * proporciones relativas. Las unidades sin cargar quedan sin cargar.
 */
export function seedScaleTo100(rows: AliquotRow[]): Map<string, number> {
  const conValor = rows.filter((r) => r.aliquot !== null && r.aliquot > 0);
  if (conValor.length === 0) return new Map();
  return distributeExact(
    100,
    conValor.map((r) => ({ id: r.id, w: r.aliquot as number })),
    ALIQUOT_MAX_DECIMALS,
  );
}

/** Formatea para mostrar, con coma decimal y sin ceros de más. */
export function formatAliquot(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(2).replace(".", ",")}%`;
}
