-- 074 · Los miembros de una unidad vuelven a traer su perfil
--
-- La migration 069 agregó unit_members.added_by y removed_by como claves
-- foráneas a profiles. Con eso unit_members quedó con TRES relaciones hacia
-- profiles, y toda consulta que pedía `unit_members → profiles(...)` sin decir
-- por cuál dejó de resolver: PostgREST responde que la relación es ambigua y la
-- consulta vuelve vacía. Resultado: las pantallas mostraban «Sin propietario
-- cargado» en unidades que sí lo tienen (Unidades, la cuenta de la unidad, el
-- recibo, Mi unidad) y los avisos no encontraban a quién escribirle.
--
-- Las dos columnas se quedan, como dato de quién agregó o retiró a la persona.
-- Se les quita solo la clave foránea: así vuelve a haber una única relación
-- entre unit_members y profiles, y ninguna consulta tiene que cambiar.
--
-- Lección: en una tabla que el código consulta con `profiles(...)`, una segunda
-- clave foránea a profiles rompe esas consultas sin que el build avise.
ALTER TABLE unit_members DROP CONSTRAINT IF EXISTS unit_members_added_by_fkey;
ALTER TABLE unit_members DROP CONSTRAINT IF EXISTS unit_members_removed_by_fkey;

COMMENT ON COLUMN unit_members.added_by IS 'Perfil que agregó a la persona. Sin clave foránea a propósito: ver la migration 074.';
COMMENT ON COLUMN unit_members.removed_by IS 'Perfil que retiró a la persona. Sin clave foránea a propósito: ver la migration 074.';

NOTIFY pgrst, 'reload schema';
