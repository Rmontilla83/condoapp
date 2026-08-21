-- 038 · Guardar el presupuesto en UNA transacción
--
-- `saveBudget` hacía DELETE de todas las partidas del año y después INSERT de
-- las nuevas, en dos llamadas separadas. Entre las dos hay una ventana: si el
-- INSERT falla —una categoría borrada mientras el admin editaba (FK RESTRICT),
-- un monto fuera de NUMERIC(12,2), un corte de red— el DELETE ya se ejecutó y
-- el presupuesto del año entero desaparece. La acción devuelve un error, el
-- editor no recarga, y el admin sigue viendo en pantalla las partidas que en la
-- base ya no existen. Cierra la pestaña y perdió el trabajo del año.
--
-- Mismo patrón que `set_unit_aliquots` (migration 035): una sola función, una
-- sola transacción implícita, o entran todas o no entra ninguna.
--
-- `organization_id = p_org` en el WHERE es defensa en profundidad: la acción ya
-- resuelve el budget desde la org del perfil, pero acá un id ajeno no matchea.

CREATE OR REPLACE FUNCTION public.replace_budget_items(
  p_org       UUID,
  p_budget_id UUID,
  p_items     JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok    BOOLEAN;
  v_count INTEGER;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items debe ser un arreglo JSON';
  END IF;

  -- El presupuesto tiene que ser de esta organización y no estar archivado.
  SELECT TRUE INTO v_ok
  FROM org_budgets
  WHERE id = p_budget_id
    AND organization_id = p_org
    AND status <> 'archived';

  IF NOT COALESCE(v_ok, FALSE) THEN
    RAISE EXCEPTION 'Presupuesto no encontrado o no editable';
  END IF;

  DELETE FROM org_budget_items WHERE budget_id = p_budget_id;

  INSERT INTO org_budget_items (
    budget_id, category_id, monthly_amount, monthly_overrides, notes
  )
  SELECT
    p_budget_id,
    (item->>'category_id')::UUID,
    COALESCE((item->>'monthly_amount')::NUMERIC, 0),
    CASE
      WHEN item->'monthly_overrides' IS NULL
        OR jsonb_typeof(item->'monthly_overrides') <> 'object'
      THEN NULL
      ELSE item->'monthly_overrides'
    END,
    NULLIF(btrim(COALESCE(item->>'notes', '')), '')
  FROM jsonb_array_elements(p_items) AS item;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- OJO con el REVOKE: en Supabase, las funciones nuevas de `public` nacen con
-- EXECUTE concedido a PUBLIC **y además** nominalmente a `anon` y
-- `authenticated` (default privileges del rol postgres). `FROM PUBLIC` borra
-- solo la entrada sin grantee y deja los dos grants nominales intactos: la
-- función seguiría siendo invocable por cualquier usuario logueado, y al ser
-- SECURITY DEFINER borraría el presupuesto de su condominio saltándose la RLS.
-- Las migrations 028, 031 y 035 ya lo hacen así; esta se había quedado corta.
REVOKE ALL ON FUNCTION public.replace_budget_items(UUID, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_budget_items(UUID, UUID, JSONB) TO service_role;

COMMENT ON FUNCTION public.replace_budget_items(UUID, UUID, JSONB) IS
  'Reemplaza todas las partidas de un presupuesto en una sola transacción. '
  'Llamada solo desde saveBudget con el admin client, después de validar el rol.';
