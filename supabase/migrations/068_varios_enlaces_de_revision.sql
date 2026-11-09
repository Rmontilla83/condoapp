-- 068 · Más de un enlace de revisión por condominio
--
-- La revisión la abren varias personas, y cada una puede tener su enlace para
-- revocarlo sin cortarle el acceso a las demás. El enlace siempre se busca por
-- su hash (lib/revision.ts), así que nada depende de que haya uno solo.
--
-- ADITIVA: solo quita una restricción.
DROP INDEX IF EXISTS verificacion_enlaces_vivo_idx;
