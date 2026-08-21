-- 040 · Reencuadrar las reservas escritas antes del arreglo de zona horaria
--
-- APLICAR DESPUÉS DE DESPLEGAR EL CÓDIGO. El corte de abajo separa las filas
-- viejas de las que ya escribe `zonedToISO`; si esta migration corre antes del
-- deploy, cualquier reserva creada en el medio se queda sin corregir.
--
-- EL PROBLEMA
--
-- `createReservation` construía el instante como `2026-08-22T14:00:00`, sin
-- desfase. `start_time` y `end_time` son TIMESTAMPTZ y la sesión de PostgREST
-- corre en UTC, así que "de 2 a 4 de la tarde" quedó grabado como 14:00Z —
-- que en Venezuela son las 10 de la mañana.
--
-- Mientras la lectura también ignoraba la zona (el servidor de Vercel corre en
-- UTC), el error se cancelaba solo y en pantalla se veía bien. Ahora que
-- `formatTimeInZone` formatea en la zona del condominio, esas filas empezarían
-- a mostrarse corridas — y peor: conviven en el mismo índice con las nuevas,
-- así que el chequeo de conflictos y el EXCLUDE de la migration 037 comparan
-- dos sistemas de coordenadas distintos. Se podría reservar dos veces el mismo
-- salón a la misma hora real, y rechazar horarios que están libres.
--
-- EL ARREGLO
--
-- El doble `AT TIME ZONE`:
--   ts AT TIME ZONE 'UTC'   → saca el reloj de pared tal como quedó grabado
--   ... AT TIME ZONE zona   → lo vuelve a fijar, ahora sí, en la zona del
--                             condominio
-- Se resuelve por organización, no con un "+4 horas" fijo: un condominio en
-- Chile o México tiene horario de verano y el desfase depende de la fecha.
--
-- Como el corrimiento es idéntico para todas las filas de una misma área, el
-- orden relativo no cambia y no puede aparecer un solapamiento nuevo que viole
-- la constraint de la 037.

DO $$
DECLARE
  -- Corte: todo lo creado antes de esto se escribió con el formato viejo.
  v_corte CONSTANT TIMESTAMPTZ := '2026-08-21 00:00:00+00';
  v_filas INTEGER;
BEGIN
  WITH zona_por_reserva AS (
    SELECT
      r.id,
      COALESCE(NULLIF(btrim(o.timezone), ''), 'America/Caracas') AS zona
    FROM reservations r
    JOIN common_areas  ca ON ca.id = r.common_area_id
    JOIN organizations o  ON o.id  = ca.organization_id
    WHERE r.created_at < v_corte
  )
  UPDATE reservations r
  SET
    start_time = (r.start_time AT TIME ZONE 'UTC') AT TIME ZONE z.zona,
    end_time   = (r.end_time   AT TIME ZONE 'UTC') AT TIME ZONE z.zona
  FROM zona_por_reserva z
  WHERE r.id = z.id;

  GET DIAGNOSTICS v_filas = ROW_COUNT;
  RAISE NOTICE 'Reservas reencuadradas: %', v_filas;
END $$;
