-- 035 · Guardar las alícuotas en UNA transacción
--
-- `setUnitAliquots` se documentaba como todo-o-nada pero escribía N UPDATE
-- sueltos con `Promise.all`. Si la unidad 43 de 60 fallaba (CHECK de rango,
-- timeout, corte de red), las otras 59 ya estaban escritas: la acción devolvía
-- error, el editor no recargaba y el admin veía sus borradores intactos —
-- mientras la base había quedado con un reparto mixto que nadie decidió.
--
-- Un solo statement corre dentro de la transacción implícita de Postgres, así
-- que o entran todas o no entra ninguna.
--
-- `organization_id = p_org` en el WHERE es defensa en profundidad: la acción ya
-- intersecta los ids contra las unidades del condominio antes de llamar, pero
-- acá un id ajeno simplemente no matchea y no escribe nada.

CREATE OR REPLACE FUNCTION public.set_unit_aliquots(p_org UUID, p_items JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_org IS NULL THEN
    RAISE EXCEPTION 'organization_id requerido';
  END IF;

  UPDATE units u
     SET aliquot = i.aliquot
    FROM jsonb_to_recordset(p_items) AS i(id UUID, aliquot NUMERIC)
   WHERE u.id = i.id
     AND u.organization_id = p_org
     -- IS DISTINCT FROM trata NULL como un valor más: sin esto, pasar de NULL a
     -- NULL contaría como cambio y de 3.8 a NULL no se detectaría.
     AND u.aliquot IS DISTINCT FROM i.aliquot;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.set_unit_aliquots(UUID, JSONB) IS
  'Actualiza las alícuotas de un condominio en un solo statement (atómico). '
  'Solo service_role: la autorización la hace la server action setUnitAliquots.';

-- Solo el servidor. La autorización real (rol admin, pertenencia a la org,
-- bloqueo por asamblea en curso) vive en la server action.
REVOKE ALL ON FUNCTION public.set_unit_aliquots(UUID, JSONB) FROM PUBLIC, anon, authenticated;
