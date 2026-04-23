-- =====================================================================
-- ATRYUM DEMO DATA — Costa de Plata + Residencias Los Olivos
-- Idempotent: puede re-ejecutarse sin romper data existente.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- FASE 1 — Organizations (Costa de Plata existe, agrego Los Olivos)
-- ---------------------------------------------------------------------

INSERT INTO organizations (id, name, address, city, country, currency, timezone, invite_code, is_active, tenant_can_vote, tenant_can_see_delinquents, tenant_can_reserve)
VALUES
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'Residencias Los Olivos', 'Av. Las Acacias, Torre Los Olivos', 'Valencia', 'VE', 'USD', 'America/Caracas', 'OLIV-2026', true, true, true, true)
ON CONFLICT (id) DO NOTHING;

-- Actualizo Costa de Plata con dirección si faltaba
UPDATE organizations
SET address = COALESCE(NULLIF(address,''), 'Calle Costa, Edif. La Plata'),
    city = COALESCE(NULLIF(city,''), 'Caracas'),
    country = COALESCE(country, 'VE')
WHERE id = 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid;

-- ---------------------------------------------------------------------
-- FASE 2 — fee_breakdown (desglose cuota mensual)
-- ---------------------------------------------------------------------

INSERT INTO fee_breakdown (organization_id, concept, amount, is_active) VALUES
  -- Costa de Plata: cuota base $85
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'Mantenimiento general', 40.00, true),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'Vigilancia 24/7', 25.00, true),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'Fondo de reserva', 12.00, true),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'Aseo areas comunes', 8.00, true),
  -- Los Olivos: cuota base $120
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'Mantenimiento general', 55.00, true),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'Vigilancia 24/7', 30.00, true),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'Fondo de reserva', 20.00, true),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'Mantenimiento piscina', 10.00, true),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'Jardineria', 5.00, true)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- FASE 3 — common_areas
-- ---------------------------------------------------------------------

INSERT INTO common_areas (id, organization_id, name, description, capacity, rules, is_active) VALUES
  -- Costa de Plata
  ('ca0a0001-0000-0000-0000-000000000001'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'Salon de fiestas', 'Salon amplio con cocina y bar', 40, 'Horario 10am-11pm. No animales.', true),
  ('ca0a0001-0000-0000-0000-000000000002'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'Piscina', 'Piscina semi-olimpica con zona infantil', 30, 'Menores acompanados. Prohibido vidrio.', true),
  ('ca0a0001-0000-0000-0000-000000000003'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'Gimnasio', 'Equipado con cardio y pesas', 12, 'Bloques de 1 hora. Traer toalla.', true),
  ('ca0a0001-0000-0000-0000-000000000004'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'Parrillera', 'Area externa con 2 parrilleras', 20, 'Reservar con 24h de antelacion.', true),
  -- Los Olivos
  ('ca0b0001-0000-0000-0000-000000000001'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'Salon social', 'Salon con vista al jardin', 60, 'Fianza $100 para eventos grandes.', true),
  ('ca0b0001-0000-0000-0000-000000000002'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'Piscina', 'Piscina con calentador solar', 40, 'Horario 7am-9pm.', true),
  ('ca0b0001-0000-0000-0000-000000000003'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'Gimnasio equipado', 'Cardio, funcional, pesas libres', 15, 'Entrenador los sabados.', true),
  ('ca0b0001-0000-0000-0000-000000000004'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'Cancha multiuso', 'Techada, para futbol y basket', 20, 'Iluminacion hasta 10pm.', true),
  ('ca0b0001-0000-0000-0000-000000000005'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'Coworking', 'Sala con WiFi y proyector', 8, 'Silencio. Max 4 horas/reserva.', true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- FASE 4 — Units
-- ---------------------------------------------------------------------

INSERT INTO units (id, organization_id, unit_number, floor, block, type, area_sqm, aliquot, ownership_mode) VALUES
  -- Costa de Plata: 14 unidades
  ('ce57aa01-0000-0000-0000-000000000001'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '1-A', 1, 'A', 'apartment', 85, 6.5, 'owner_occupied'),
  ('ce57aa01-0000-0000-0000-000000000002'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '1-B', 1, 'A', 'apartment', 85, 6.5, 'owner_occupied'),
  ('ce57aa01-0000-0000-0000-000000000003'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '2-A', 2, 'A', 'apartment', 85, 6.5, 'tenant_with_active_owner'),
  ('ce57aa01-0000-0000-0000-000000000004'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '2-B', 2, 'A', 'apartment', 85, 6.5, 'owner_occupied'),
  ('ce57aa01-0000-0000-0000-000000000005'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '3-A', 3, 'A', 'apartment', 95, 7.2, 'tenant_only'),
  ('ce57aa01-0000-0000-0000-000000000006'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '3-B', 3, 'A', 'apartment', 95, 7.2, 'owner_occupied'),
  ('ce57aa01-0000-0000-0000-000000000007'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '4-A', 4, 'A', 'apartment', 95, 7.2, 'owner_occupied'),
  ('ce57aa01-0000-0000-0000-000000000008'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '4-B', 4, 'A', 'apartment', 95, 7.2, 'tenant_with_active_owner'),
  ('ce57aa01-0000-0000-0000-000000000009'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '5-A', 5, 'A', 'apartment', 110, 8.3, 'owner_occupied'),
  ('ce57aa01-0000-0000-0000-000000000010'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '5-B', 5, 'A', 'apartment', 110, 8.3, 'owner_occupied'),
  ('ce57aa01-0000-0000-0000-000000000011'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'PH-1', 6, 'A', 'penthouse', 180, 13.6, 'owner_occupied'),
  ('ce57aa01-0000-0000-0000-000000000012'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'PH-2', 6, 'A', 'penthouse', 180, 13.6, 'tenant_only'),
  ('ce57aa01-0000-0000-0000-000000000013'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'L-1', 0, 'A', 'local', 50, 3.8, 'owner_occupied'),
  ('ce57aa01-0000-0000-0000-000000000014'::uuid, 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'L-2', 0, 'A', 'local', 50, 3.8, 'owner_occupied'),
  -- Los Olivos: 18 unidades
  ('011ce501-0000-0000-0000-000000000001'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T1-101', 1, 'T1', 'apartment', 78, 5.2, 'owner_occupied'),
  ('011ce501-0000-0000-0000-000000000002'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T1-102', 1, 'T1', 'apartment', 78, 5.2, 'tenant_only'),
  ('011ce501-0000-0000-0000-000000000003'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T1-201', 2, 'T1', 'apartment', 78, 5.2, 'owner_occupied'),
  ('011ce501-0000-0000-0000-000000000004'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T1-202', 2, 'T1', 'apartment', 78, 5.2, 'tenant_with_active_owner'),
  ('011ce501-0000-0000-0000-000000000005'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T1-301', 3, 'T1', 'apartment', 92, 6.1, 'owner_occupied'),
  ('011ce501-0000-0000-0000-000000000006'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T1-302', 3, 'T1', 'apartment', 92, 6.1, 'owner_occupied'),
  ('011ce501-0000-0000-0000-000000000007'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T1-401', 4, 'T1', 'apartment', 92, 6.1, 'tenant_only'),
  ('011ce501-0000-0000-0000-000000000008'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T1-402', 4, 'T1', 'apartment', 92, 6.1, 'owner_occupied'),
  ('011ce501-0000-0000-0000-000000000009'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T2-101', 1, 'T2', 'apartment', 78, 5.2, 'owner_occupied'),
  ('011ce501-0000-0000-0000-000000000010'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T2-102', 1, 'T2', 'apartment', 78, 5.2, 'tenant_with_active_owner'),
  ('011ce501-0000-0000-0000-000000000011'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T2-201', 2, 'T2', 'apartment', 78, 5.2, 'owner_occupied'),
  ('011ce501-0000-0000-0000-000000000012'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T2-202', 2, 'T2', 'apartment', 78, 5.2, 'owner_occupied'),
  ('011ce501-0000-0000-0000-000000000013'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T2-301', 3, 'T2', 'apartment', 92, 6.1, 'tenant_only'),
  ('011ce501-0000-0000-0000-000000000014'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T2-302', 3, 'T2', 'apartment', 92, 6.1, 'owner_occupied'),
  ('011ce501-0000-0000-0000-000000000015'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T2-401', 4, 'T2', 'apartment', 92, 6.1, 'owner_occupied'),
  ('011ce501-0000-0000-0000-000000000016'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'T2-402', 4, 'T2', 'apartment', 92, 6.1, 'tenant_with_active_owner'),
  ('011ce501-0000-0000-0000-000000000017'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'PH-OLI-1', 5, 'T1', 'penthouse', 170, 11.3, 'owner_occupied'),
  ('011ce501-0000-0000-0000-000000000018'::uuid, 'c05ade01-0000-0000-0000-000000000001'::uuid, 'PH-OLI-2', 5, 'T2', 'penthouse', 170, 11.3, 'owner_occupied')
ON CONFLICT (id) DO NOTHING;

COMMIT;
