/**
 * Formato de montos, uno solo para toda la app: $1.234,56 y Bs 344.542,04.
 *
 * Antes cada pantalla usaba `toFixed(2)`: el inicio decía $402,03 (el contador
 * animado sí usaba es-VE), Pagos decía $402.03 y los bolívares salían sin
 * separador de miles (Bs 344542.04), ilegibles en montos de seis cifras.
 *
 * Para COPIAR un monto a la app del banco no uses esto: ahí va el número crudo.
 */

const dosDecimales = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234.5 → "1.234,50" */
export function monto(n: number | string | null | undefined): string {
  const v = Number(n);
  return dosDecimales.format(Number.isFinite(v) ? v : 0);
}

/** 1234.5 → "$1.234,50" (o "USD" / "EUR" delante si no es dólar). */
export function usd(n: number | string | null | undefined, moneda = "USD"): string {
  const v = Number(n) || 0;
  const signo = v < 0 ? "−" : "";
  const prefijo = moneda === "USD" ? "$" : `${moneda} `;
  return `${signo}${prefijo}${monto(Math.abs(v))}`;
}

/** 344542.04 → "Bs 344.542,04" */
export function bs(n: number | string | null | undefined): string {
  return `Bs ${monto(n)}`;
}

/** Tasa BCV: 857.0058 → "857,01" */
export function tasa(n: number | string | null | undefined): string {
  return monto(n);
}
