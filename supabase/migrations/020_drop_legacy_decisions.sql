-- ============================================
-- 020 — Drop tablas legacy reemplazadas por decisions
-- ============================================
-- Parte de E3 PR #3. Las tablas polls/poll_votes/assemblies/votes/
-- vote_responses fueron migradas a decisions/decision_questions/
-- decision_responses en migration 019. UI ya migró en PR #2.
-- Pre-check confirmó 0 rows huérfanos.
--
-- Drop en orden correcto (respeta FKs).

-- 1) DROP poll_votes (FK -> polls)
DROP TABLE IF EXISTS poll_votes CASCADE;

-- 2) DROP polls
DROP TABLE IF EXISTS polls CASCADE;

-- 3) DROP vote_responses (FK -> votes)
DROP TABLE IF EXISTS vote_responses CASCADE;

-- 4) DROP votes (FK -> assemblies)
DROP TABLE IF EXISTS votes CASCADE;

-- 5) DROP assemblies
DROP TABLE IF EXISTS assemblies CASCADE;

-- 6) Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
