// Server-only: firmar requiere la service-role key. No importar desde un
// componente "use client" — createAdminClient() tira si no encuentra la env var,
// y esa key jamás debe llegar al bundle.
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Buckets privados. Ver migration 030.
 *
 * Antes eran `public = true` con una policy `FOR SELECT TO public`: bastaba la
 * anon key (que viaja en el bundle) para enumerar las carpetas de todos los
 * condominios y descargar cualquier comprobante bancario sin sesión.
 */
export const STORAGE_BUCKETS = ["payment-receipts", "maintenance-photos"] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

const PUBLIC_MARKER = "/storage/v1/object/public/";

/** Cuánto vive una URL firmada. Suficiente para ver la página sin volverla eterna. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Normaliza una referencia guardada en la base a `{ bucket, path }`.
 *
 * Acepta los dos formatos que conviven en producción:
 *  - **Nuevo** — `payment-receipts/<org_id>/group-123.png`
 *  - **Legacy** — la URL pública completa que se guardaba antes de la migration
 *    030. Esas URLs ya no resuelven, pero siguen codificando bucket y path, así
 *    que se pueden firmar igual. No hace falta migrar los datos viejos.
 */
export function parseStorageRef(
  value: string | null | undefined,
): { bucket: StorageBucket; path: string } | null {
  if (!value) return null;

  const marker = value.indexOf(PUBLIC_MARKER);
  const rest = marker >= 0 ? value.slice(marker + PUBLIC_MARKER.length) : value;

  const slash = rest.indexOf("/");
  if (slash <= 0) return null;

  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1);
  if (!path) return null;
  if (!STORAGE_BUCKETS.includes(bucket as StorageBucket)) return null;

  return { bucket: bucket as StorageBucket, path: decodeURIComponent(path) };
}

/**
 * Convierte referencias guardadas en URLs firmadas, conservando el orden y los
 * huecos: la posición `i` de la salida corresponde a la `i` de la entrada, y es
 * `null` si esa referencia no existía o no se pudo firmar.
 *
 * Agrupa por bucket y usa `createSignedUrls` para no hacer una request por
 * archivo. Es server-only: firmar necesita la service-role key.
 */
export async function signStorageRefs(
  values: (string | null | undefined)[],
  expiresIn: number = SIGNED_URL_TTL_SECONDS,
): Promise<(string | null)[]> {
  const out: (string | null)[] = values.map(() => null);

  const porBucket = new Map<StorageBucket, { path: string; idx: number }[]>();
  values.forEach((value, idx) => {
    const ref = parseStorageRef(value);
    if (!ref) return;
    const lista = porBucket.get(ref.bucket) ?? [];
    lista.push({ path: ref.path, idx });
    porBucket.set(ref.bucket, lista);
  });

  if (porBucket.size === 0) return out;

  const admin = createAdminClient();

  await Promise.all(
    [...porBucket.entries()].map(async ([bucket, entradas]) => {
      const { data, error } = await admin.storage
        .from(bucket)
        .createSignedUrls(
          entradas.map((e) => e.path),
          expiresIn,
        );

      if (error || !data) {
        console.error(`[storage] no se pudo firmar en ${bucket}:`, error?.message);
        return;
      }

      // Emparejamos por `path` y no por posición: no queremos depender de que
      // la API devuelva los resultados en el mismo orden en que se pidieron.
      // Un mismo path puede aparecer repetido (dos filas que apuntan al mismo
      // archivo), así que cada uno guarda su cola de índices.
      const pendientes = new Map<string, number[]>();
      for (const { path, idx } of entradas) {
        const cola = pendientes.get(path) ?? [];
        cola.push(idx);
        pendientes.set(path, cola);
      }

      for (const item of data) {
        if (!item?.signedUrl || !item.path) continue;
        const cola = pendientes.get(item.path);
        if (!cola?.length) continue;
        for (const idx of cola) out[idx] = item.signedUrl;
        pendientes.delete(item.path);
      }
    }),
  );

  return out;
}

/** Azúcar para una sola referencia. */
export async function signStorageRef(
  value: string | null | undefined,
  expiresIn: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const [url] = await signStorageRefs([value], expiresIn);
  return url ?? null;
}

/**
 * Firma filas de referencias (p. ej. `maintenance_requests.photo_urls`) en una
 * sola tanda, conservando la forma. Las que no se puedan firmar se descartan de
 * su fila, así el consumidor nunca renderiza un `<img>` roto.
 */
export async function signStorageRefRows(
  rows: (string[] | null | undefined)[],
  expiresIn: number = SIGNED_URL_TTL_SECONDS,
): Promise<string[][]> {
  const plano: (string | null)[] = [];
  const tramos: { inicio: number; largo: number }[] = [];

  for (const fila of rows) {
    const items = fila ?? [];
    tramos.push({ inicio: plano.length, largo: items.length });
    plano.push(...items);
  }

  const firmadas = await signStorageRefs(plano, expiresIn);

  return tramos.map(({ inicio, largo }) =>
    firmadas.slice(inicio, inicio + largo).filter((u): u is string => Boolean(u)),
  );
}
