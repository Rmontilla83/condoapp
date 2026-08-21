-- 037 · Integridad de datos: que la base impida lo que la app ya intentaba impedir
--
-- Tres reglas que hasta hoy vivían solo en TypeScript, como un "chequear y
-- después insertar". Entre el chequeo y el insert hay una ventana, y la anon key
-- viaja en el bundle: cualquiera puede saltarse la server action.
--
-- Prechecks ejecutados contra producción antes de escribir esta migration:
--   colisiones case-insensitive de cuotas ..... 0
--   cuotas con 2+ comprobantes pendientes ..... 0
--   pares de reservas confirmadas solapadas ... 0

-- ═══════════════════════════════════════════════════════════════════════
-- A) Cuotas duplicadas: la unicidad deja de depender de las mayúsculas
--
-- La constraint de la migration 016 era UNIQUE (unit_id, due_date, kind,
-- description) — sensible a mayúsculas y espacios. En producción eso costó
-- $700: la misma derrama se emitió dos veces con 89 segundos de diferencia,
-- "Reparacion de porton de emergencia" y "reparacion de porton de emergencia",
-- y las 14 unidades de Costa de Plata quedaron con el cobro repetido.
-- (La migration 027 reparó el daño; esto impide que vuelva a ocurrir.)
--
-- Parcial sobre las no canceladas a propósito: sin eso, anular una tanda mal
-- emitida y volver a generarla chocaría contra las filas anuladas.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS unique_invoice_per_unit_period;

DROP INDEX IF EXISTS invoices_unique_per_unit_period;

CREATE UNIQUE INDEX invoices_unique_per_unit_period
  ON invoices (unit_id, due_date, kind, lower(btrim(description)))
  WHERE status <> 'cancelled';

-- ═══════════════════════════════════════════════════════════════════════
-- B) Un solo comprobante en revisión por cuota
--
-- El filtro de "en revisión" vivía solo en la UI: nada impedía mandar dos
-- comprobantes para la misma cuota, y el admin terminaba con dos pendientes del
-- mismo pago sin saber cuál aprobar.
-- ═══════════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS transactions_one_pending_per_invoice;

CREATE UNIQUE INDEX transactions_one_pending_per_invoice
  ON transactions (invoice_id)
  WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════════════
-- C) Dos vecinos no pueden reservar el mismo espacio a la misma hora
--
-- createReservation hacía SELECT de conflictos y después INSERT. Dos personas
-- tocando "Reservar" a la vez pasan las dos por el hueco. Con un rango de
-- exclusión la base lo resuelve, sin importar por dónde entre la escritura.
--
-- `[)` — inicio inclusivo, fin exclusivo: una reserva de 14:00 a 16:00 y otra
-- de 16:00 a 18:00 NO se solapan, que es lo que espera cualquiera.
--
-- btree_gist es lo que permite mezclar un uuid (=) con un rango (&&) en el
-- mismo índice GiST. La migration 001 la crea sin esquema explícito; en Supabase
-- las extensiones viven en `extensions`, que no está en el search_path del push
-- —por eso el primer intento falló con "uuid has no default operator class".
-- ═══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_no_overlap;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_no_overlap
  EXCLUDE USING gist (
    common_area_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (status = 'confirmed');
