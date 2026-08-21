-- 039 · El acta de la asamblea
--
-- `closeDecision` escribía `status='closed'` y nada más. El resultado —quiénes
-- votaron, cuánta alícuota sumaron, si se alcanzó el quórum, qué ganó cada
-- pregunta— seguía calculándose EN VIVO cada vez que alguien abría la página,
-- contra las unidades y las alícuotas de HOY.
--
-- Eso significa que el resultado de una asamblea de marzo cambia solo cuando el
-- administrador corrige una alícuota en agosto, o cuando se da de alta un
-- apartamento nuevo. Una decisión de condominio que se puede reescribir sin
-- querer no sirve como acta: es exactamente el documento que un vecino va a
-- sacar cuando no esté de acuerdo con lo que se aprobó.
--
-- El snapshot congela el resultado en el momento del cierre. La página lo lee
-- cuando existe, y solo recalcula mientras la asamblea sigue abierta.

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS result_snapshot JSONB;

COMMENT ON COLUMN decisions.result_snapshot IS
  'Acta congelada al cerrar: universo de alícuota, votantes, quórum alcanzado y '
  'conteo por pregunta. Lo escribe closeDecision. Nunca se recalcula.';
COMMENT ON COLUMN decisions.closed_at IS
  'Cuándo se cerró. NULL mientras sigue abierta.';
COMMENT ON COLUMN decisions.closed_by IS
  'Quién la cerró. Queda en el acta.';

-- El snapshot, si existe, tiene que ser un objeto. Un string JSON-encoded se ve
-- igual desde PostgREST y revienta en el runtime al leer sus campos.
ALTER TABLE decisions
  DROP CONSTRAINT IF EXISTS decisions_result_snapshot_es_objeto;

ALTER TABLE decisions
  ADD CONSTRAINT decisions_result_snapshot_es_objeto
  CHECK (result_snapshot IS NULL OR jsonb_typeof(result_snapshot) = 'object')
  NOT VALID;

ALTER TABLE decisions VALIDATE CONSTRAINT decisions_result_snapshot_es_objeto;
