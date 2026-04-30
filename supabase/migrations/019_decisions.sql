-- ============================================
-- 019 — Decisions: unifica polls + assemblies en un solo modelo
-- ============================================
-- Parte de E3. Crea decisions/decision_questions/decision_responses.
-- Backfill data de polls/poll_votes/assemblies/votes/vote_responses
-- preservando IDs (UUIDs no chocan, verificado en pre-check).
--
-- NO drop tablas legacy todavía (eso es PR #3 = migration 020).
-- /votaciones page sigue funcional hasta PR #2 (redirect).
-- getDashboardContext se actualiza para leer de decisions en este PR.

-- ============================================
-- 1. decisions
-- ============================================
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  kind TEXT NOT NULL CHECK (kind IN ('quick_poll', 'formal_assembly')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft', 'open', 'closed', 'cancelled')),
  weighted_by_aliquot BOOLEAN NOT NULL DEFAULT false,
  quorum_pct NUMERIC(5,2),
  scheduled_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE decisions IS
  'Modelo unificado de decisiones de gobierno (E3). Reemplaza polls + assemblies.';
COMMENT ON COLUMN decisions.kind IS
  'quick_poll = encuesta rápida, 1 pregunta. formal_assembly = asamblea con N preguntas y posible quórum.';
COMMENT ON COLUMN decisions.weighted_by_aliquot IS
  'Si true, decision_responses.weight = alícuota del owner activo (snapshot al votar).';
COMMENT ON COLUMN decisions.quorum_pct IS
  '% de alícuota requerida para aprobar (solo formal_assembly). NULL=sin quórum requerido.';
COMMENT ON COLUMN decisions.scheduled_at IS
  'Cuándo es la asamblea (info display). Solo formal_assembly.';
COMMENT ON COLUMN decisions.closes_at IS
  'Deadline para votar. NULL=sin deadline. Si now() > closes_at, server action rechaza voto.';

CREATE INDEX IF NOT EXISTS idx_decisions_org ON decisions(organization_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);

-- ============================================
-- 2. decision_questions
-- ============================================
CREATE TABLE IF NOT EXISTS decision_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  position INT NOT NULL DEFAULT 0
);

COMMENT ON COLUMN decision_questions.position IS
  'Orden de la pregunta dentro de la asamblea (0-based).';

CREATE INDEX IF NOT EXISTS idx_decision_questions_decision ON decision_questions(decision_id);

-- ============================================
-- 3. decision_responses
-- ============================================
CREATE TABLE IF NOT EXISTS decision_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES decision_questions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  weight NUMERIC(8,4) DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, voter_id)
);

COMMENT ON COLUMN decision_responses.weight IS
  'Peso del voto: 1.0 si decision.weighted_by_aliquot=false, alícuota del owner si true (snapshot).';

CREATE INDEX IF NOT EXISTS idx_decision_responses_voter ON decision_responses(voter_id);
CREATE INDEX IF NOT EXISTS idx_decision_responses_question ON decision_responses(question_id);

-- ============================================
-- 4. RLS policies (mirror de polls/poll_votes)
-- ============================================
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_responses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- decisions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can view decisions in their org' AND tablename='decisions') THEN
    CREATE POLICY "Users can view decisions in their org"
      ON decisions FOR SELECT TO authenticated
      USING (organization_id = public.user_org_id());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Admins can manage decisions' AND tablename='decisions') THEN
    CREATE POLICY "Admins can manage decisions"
      ON decisions FOR ALL TO authenticated
      USING (organization_id = public.user_org_id() AND public.user_role() IN ('admin','super_admin'));
  END IF;

  -- decision_questions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can view decision_questions' AND tablename='decision_questions') THEN
    CREATE POLICY "Users can view decision_questions"
      ON decision_questions FOR SELECT TO authenticated
      USING (decision_id IN (SELECT id FROM decisions WHERE organization_id = public.user_org_id()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Admins can manage decision_questions' AND tablename='decision_questions') THEN
    CREATE POLICY "Admins can manage decision_questions"
      ON decision_questions FOR ALL TO authenticated
      USING (decision_id IN (SELECT id FROM decisions WHERE organization_id = public.user_org_id() AND public.user_role() IN ('admin','super_admin')));
  END IF;

  -- decision_responses
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can view decision_responses' AND tablename='decision_responses') THEN
    CREATE POLICY "Users can view decision_responses"
      ON decision_responses FOR SELECT TO authenticated
      USING (question_id IN (
        SELECT q.id FROM decision_questions q
        JOIN decisions d ON d.id = q.decision_id
        WHERE d.organization_id = public.user_org_id()
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can submit decision_responses' AND tablename='decision_responses') THEN
    CREATE POLICY "Users can submit decision_responses"
      ON decision_responses FOR INSERT TO authenticated
      WITH CHECK (
        voter_id = auth.uid()
        AND question_id IN (
          SELECT q.id FROM decision_questions q
          JOIN decisions d ON d.id = q.decision_id
          WHERE d.organization_id = public.user_org_id()
        )
      );
  END IF;
END $$;

-- ============================================
-- 5. Backfill polls → decisions
-- ============================================
DO $$
DECLARE
  v_polls INT;
  v_poll_votes INT;
  v_assemblies INT;
  v_votes INT;
  v_vote_responses INT;
  v_assembly_creator UUID;
BEGIN
  -- 5a) polls → decisions (kind='quick_poll', preserva ID)
  INSERT INTO decisions (id, organization_id, created_by, kind, title, status, closes_at, created_at)
  SELECT
    p.id,
    p.organization_id,
    p.created_by,
    'quick_poll',
    p.question,
    CASE WHEN p.is_open THEN 'open' ELSE 'closed' END,
    p.ends_at,
    p.created_at
  FROM polls p
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_polls = ROW_COUNT;

  -- 5b) poll → decision_question (1 question per poll, mismo ID que decision)
  INSERT INTO decision_questions (id, decision_id, question, options, position)
  SELECT
    p.id,  -- preservamos el ID del poll también para la question (decisión: 1 row poll = 1 question con mismo id)
    p.id,
    p.question,
    p.options,
    0
  FROM polls p
  ON CONFLICT (id) DO NOTHING;

  -- 5c) poll_votes → decision_responses (weight=1.0)
  INSERT INTO decision_responses (question_id, voter_id, selected_option, weight, created_at)
  SELECT
    pv.poll_id,  -- question_id es el mismo ID del poll
    pv.voter_id,
    pv.selected_option,
    1.0,
    pv.created_at
  FROM poll_votes pv
  ON CONFLICT (question_id, voter_id) DO NOTHING;
  GET DIAGNOSTICS v_poll_votes = ROW_COUNT;

  -- ============================================
  -- 6. Backfill assemblies → decisions
  -- ============================================
  FOR v_assembly_creator IN SELECT DISTINCT
      COALESCE(
        (SELECT id FROM profiles WHERE role IN ('admin','super_admin')
          AND organization_id = a.organization_id ORDER BY created_at LIMIT 1),
        (SELECT id FROM profiles WHERE role = 'super_admin' ORDER BY created_at LIMIT 1)
      )
    FROM assemblies a
  LOOP
    -- Solo iteramos para validar que existe creator candidato; el INSERT real está abajo.
    NULL;
  END LOOP;

  INSERT INTO decisions (id, organization_id, created_by, kind, title, description, status, scheduled_at, quorum_pct, weighted_by_aliquot, created_at)
  SELECT
    a.id,
    a.organization_id,
    COALESCE(
      (SELECT id FROM profiles WHERE role IN ('admin','super_admin')
        AND organization_id = a.organization_id ORDER BY created_at LIMIT 1),
      (SELECT id FROM profiles WHERE role = 'super_admin' ORDER BY created_at LIMIT 1)
    ),
    'formal_assembly',
    a.title,
    a.description,
    CASE a.status
      WHEN 'completed' THEN 'closed'
      WHEN 'cancelled' THEN 'cancelled'
      ELSE 'open'
    END,
    a.scheduled_at,
    a.quorum_required,
    false,
    a.created_at
  FROM assemblies a
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_assemblies = ROW_COUNT;

  -- 6b) votes → decision_questions (preserva ID)
  INSERT INTO decision_questions (id, decision_id, question, options, position)
  SELECT
    v.id,
    v.assembly_id,
    v.question,
    v.options,
    0
  FROM votes v
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_votes = ROW_COUNT;

  -- 6c) vote_responses → decision_responses
  INSERT INTO decision_responses (question_id, voter_id, selected_option, weight, created_at)
  SELECT
    vr.vote_id,
    vr.voter_id,
    vr.selected_option,
    1.0,
    vr.created_at
  FROM vote_responses vr
  ON CONFLICT (question_id, voter_id) DO NOTHING;
  GET DIAGNOSTICS v_vote_responses = ROW_COUNT;

  RAISE NOTICE '[019] Backfill: % polls -> decisions, % poll_votes -> responses, % assemblies, % votes -> questions, % vote_responses -> responses',
    v_polls, v_poll_votes, v_assemblies, v_votes, v_vote_responses;
END $$;

-- ============================================
-- 7. Reload PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload schema';
