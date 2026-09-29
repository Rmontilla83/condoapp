-- 049 · Íconos de categorías de gasto sin emojis
--
-- Rafael (2026-09-29): «los emoticones no se ven serios». La app ahora dibuja
-- íconos de línea (src/components/ui/icono.tsx) y guarda su nombre. El código
-- sigue entendiendo los emojis viejos, así que el orden de despliegue da igual.

UPDATE expense_categories SET icon = CASE icon
  WHEN '🛡️' THEN 'escudo'
  WHEN '🛡'  THEN 'escudo'
  WHEN '🔧' THEN 'herramienta'
  WHEN '✨' THEN 'brillo'
  WHEN '⚡' THEN 'rayo'
  WHEN '💧' THEN 'gota'
  WHEN '🌿' THEN 'hoja'
  WHEN '👥' THEN 'familia'
  WHEN '🏛' THEN 'edificio'
  WHEN '🏛️' THEN 'edificio'
  WHEN '📦' THEN 'paquete'
  WHEN '💼' THEN 'maletin'
  WHEN '🎉' THEN 'fiesta'
  WHEN '·'  THEN 'punto'
  ELSE icon END;

CREATE OR REPLACE FUNCTION seed_default_expense_categories(p_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO expense_categories (organization_id, code, label, icon, is_system, position) VALUES
    (p_org_id, 'vigilancia',     'Vigilancia',                'escudo',      true, 0),
    (p_org_id, 'mantenimiento',  'Mantenimiento',             'herramienta', true, 1),
    (p_org_id, 'aseo',           'Aseo y limpieza',           'brillo',      true, 2),
    (p_org_id, 'servicios',      'Servicios (luz/agua/gas)',  'rayo',        true, 3),
    (p_org_id, 'piscina',        'Piscina',                   'gota',        true, 4),
    (p_org_id, 'jardineria',     'Jardinería',                'hoja',        true, 5),
    (p_org_id, 'nomina',         'Nómina',                    'familia',     true, 6),
    (p_org_id, 'seguros',        'Seguros',                   'escudo',      true, 7),
    (p_org_id, 'impuestos',      'Impuestos',                 'edificio',    true, 8),
    (p_org_id, 'repuestos',      'Repuestos',                 'paquete',     true, 9),
    (p_org_id, 'oficina',        'Oficina admin',             'maletin',     true, 10),
    (p_org_id, 'eventos',        'Eventos',                   'fiesta',      true, 11),
    (p_org_id, 'otros',          'Otros',                     'punto',       true, 12)
  ON CONFLICT (organization_id, code) DO NOTHING;
END;
$$;
