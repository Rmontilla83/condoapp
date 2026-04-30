-- Repara filas legacy donde decision_questions.options se grabó como
-- string JSONB en lugar de array JSONB. Bug heredado de la UI antigua
-- de /votaciones que insertaba el array doble-encoded; la migration 019
-- copió esa corrupción a decisions.
--
-- Idempotente: solo afecta filas con jsonb_typeof = 'string'.
-- Aplicada en prod 2026-04-30 (1 fila reparada: question 830306f7).

UPDATE decision_questions
SET options = (options #>> '{}')::jsonb
WHERE jsonb_typeof(options) = 'string';

-- Verify (RAISE si quedó alguna)
DO $$
DECLARE
  v_remaining INT;
BEGIN
  SELECT count(*) INTO v_remaining FROM decision_questions
  WHERE jsonb_typeof(options) <> 'array';
  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Quedan % filas con options no-array', v_remaining;
  END IF;
END $$;
