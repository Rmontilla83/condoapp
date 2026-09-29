/**
 * Lectura de la planilla de contactos de propietarios.
 *
 * La junta la entrega en Excel. Se acepta pegada tal cual desde Excel
 * (columnas separadas por tabulador) o como CSV con coma o punto y coma. La
 * primera fila puede traer los títulos (los de la planilla que descarga la
 * app: Torre, Unidad, Propietario, Correo, Teléfono); si no, cada celda se
 * reconoce por su forma.
 */

export interface FilaContacto {
  linea: number;
  torre: string;
  unidad: string;
  nombre: string;
  correo: string;
  telefono: string;
}

/** Los correos de la carga inicial: TLD reservado, no reciben nada. */
export function esCorreoProvisional(correo: string | null | undefined): boolean {
  return !correo || /\.(test|example|invalid|localhost)$/i.test(correo.trim());
}

export function correoValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo);
}

/** «Torre A» + «Apto 1-1» → «A|1-1». Tolera mayúsculas, espacios y prefijos. */
export function claveUnidad(torre: string | null | undefined, unidad: string): string {
  const t = (torre ?? "")
    .toUpperCase()
    .replace(/TORRE|EDIFICIO|EDIF\.?|BLOQUE/g, "")
    .replace(/[^A-Z0-9]/g, "");
  const u = unidad
    .toUpperCase()
    .replace(/APARTAMENTO|APTO\.?|APT\.?|NRO\.?|N°|#/g, "")
    .replace(/[–—_]/g, "-")
    .replace(/\s+/g, "");
  return `${t}|${u}`;
}

/** Teléfono venezolano a formato internacional: 0414-123.45.67 → +584141234567. */
export function normalizarTelefono(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  let d = limpio.replace(/\D/g, "");
  if (limpio.startsWith("+")) return d.length >= 10 ? `+${d}` : null;
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `58${d.slice(1)}`;
  else if (d.length === 10) d = `58${d}`;
  return d.length >= 11 && d.length <= 15 ? `+${d}` : null;
}

function separarLinea(linea: string, sep: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let comillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (comillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') comillas = false;
      else actual += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) {
      celdas.push(actual.trim());
      actual = "";
    } else actual += c;
  }
  celdas.push(actual.trim());
  return celdas;
}

const TITULOS: Record<keyof Omit<FilaContacto, "linea">, RegExp> = {
  torre: /^(torre|edificio|bloque)/i,
  unidad: /^(unidad|apto|apartamento|apt|n[uú]mero|local)/i,
  nombre: /^(propietari|nombre|titular|due[nñ]o)/i,
  correo: /^(correo|e-?mail|mail)/i,
  telefono: /^(tel[eé]fono|celular|m[oó]vil|whats|tlf|tel)/i,
};

export function leerPlanilla(texto: string): { filas: FilaContacto[]; error?: string } {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/);
  const primera = lineas.find((l) => l.trim()) ?? "";
  if (!primera) return { filas: [], error: "La planilla está vacía." };
  const sep = primera.includes("\t")
    ? "\t"
    : (primera.match(/;/g)?.length ?? 0) >= (primera.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const cabecera = separarLinea(primera, sep);
  const columnas: Partial<Record<keyof typeof TITULOS, number>> = {};
  cabecera.forEach((titulo, i) => {
    // Un título no lleva dígitos ni @: «Apto 1-1» o «Torre A» con correo son datos.
    if (/[\d@]/.test(titulo)) return;
    for (const [campo, re] of Object.entries(TITULOS) as [keyof typeof TITULOS, RegExp][]) {
      if (columnas[campo] === undefined && re.test(titulo)) {
        columnas[campo] = i;
        break;
      }
    }
  });
  const conTitulos = columnas.unidad !== undefined;
  if (conTitulos && columnas.correo === undefined && columnas.telefono === undefined) {
    return { filas: [], error: "No encontré una columna de correo ni de teléfono." };
  }

  const filas: FilaContacto[] = [];
  let empezo = false;
  lineas.forEach((linea, i) => {
    if (!linea.trim()) return;
    if (!empezo) {
      empezo = true;
      if (conTitulos) return;
    }
    const celdas = separarLinea(linea, sep);
    if (!conTitulos) {
      // Sin títulos se reconoce cada celda por su forma: el correo por la @,
      // el teléfono por los dígitos; lo demás es torre, unidad y nombre en
      // ese orden (o solo la unidad, si viene una sola: «A-1-1»).
      const correo = celdas.find((c) => c.includes("@")) ?? "";
      const telefono = celdas.find((c) => !c.includes("@") && (c.match(/\d/g)?.length ?? 0) >= 10) ?? "";
      const resto = celdas.filter((c) => c && c !== correo && c !== telefono);
      const [torre, unidad, nombre] = resto.length === 1 ? ["", resto[0], ""] : [resto[0] ?? "", resto[1] ?? "", resto[2] ?? ""];
      if (unidad || correo || telefono) filas.push({ linea: i + 1, torre, unidad, nombre, correo: correo.toLowerCase(), telefono });
      return;
    }
    const valor = (c: keyof typeof TITULOS) => (columnas[c] !== undefined ? (celdas[columnas[c]!] ?? "") : "");
    const fila: FilaContacto = {
      linea: i + 1,
      torre: valor("torre"),
      unidad: valor("unidad"),
      nombre: valor("nombre"),
      correo: valor("correo").toLowerCase(),
      telefono: valor("telefono"),
    };
    if (fila.unidad || fila.correo || fila.telefono) filas.push(fila);
  });
  if (filas.length === 0) return { filas, error: "No encontré filas con datos debajo de los títulos." };
  if (filas.length > 1000) return { filas: [], error: "Son más de 1.000 filas; divide la planilla." };
  return { filas };
}

/** CSV con punto y coma y BOM: Excel en español lo abre en columnas sin preguntar. */
export function planillaCsv(filas: { torre: string; unidad: string; nombre: string; correo: string; telefono: string }[]): string {
  const celda = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lineas = [
    ["Torre", "Unidad", "Propietario", "Correo", "Teléfono"],
    ...filas.map((f) => [f.torre, f.unidad, f.nombre, f.correo, f.telefono]),
  ].map((l) => l.map(celda).join(";"));
  return `﻿${lineas.join("\r\n")}\r\n`;
}
