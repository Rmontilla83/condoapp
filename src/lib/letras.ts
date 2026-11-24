/**
 * Un monto dicho en palabras, como va en un comprobante de pago:
 * 147.42 → «ciento cuarenta y siete dólares con 42/100».
 */

const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function menosDeMil(n: number): string {
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CENTENAS[c]);
  if (r < 30) {
    if (r) partes.push(UNIDADES[r]);
  } else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    partes.push(u ? `${DECENAS[d]} y ${UNIDADES[u]}` : DECENAS[d]);
  }
  return partes.join(" ");
}

/** «veintiuno» → «veintiún», «uno» → «un»: la forma que va delante de un sustantivo. */
const apocopar = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");

export function enteroEnLetras(n: number): string {
  const v = Math.floor(Math.abs(n));
  if (v === 0) return "cero";
  const millones = Math.floor(v / 1_000_000);
  const miles = Math.floor((v % 1_000_000) / 1000);
  const resto = v % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "un millón" : `${apocopar(enteroEnLetras(millones))} millones`);
  if (miles) partes.push(miles === 1 ? "mil" : `${apocopar(menosDeMil(miles))} mil`);
  if (resto) partes.push(menosDeMil(resto));
  return partes.join(" ");
}

export function montoEnLetras(monto: number, moneda = "USD"): string {
  const centavos = Math.round(Math.abs(monto) * 100);
  const entero = Math.floor(centavos / 100);
  const cent = String(centavos % 100).padStart(2, "0");
  const nombre = moneda === "USD" ? (entero === 1 ? "dólar" : "dólares") : moneda === "VES" ? (entero === 1 ? "bolívar" : "bolívares") : moneda;
  const de = entero >= 1_000_000 && entero % 1_000_000 === 0 ? "de " : "";
  return `${apocopar(enteroEnLetras(entero))} ${de}${nombre} con ${cent}/100`;
}
