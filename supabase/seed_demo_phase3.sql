-- =====================================================================
-- ATRYUM DEMO — FASE 3: Invoices, transactions, announcements,
-- maintenance, polls, reservations, expenses, passes, assemblies
-- =====================================================================

BEGIN;

-- IDs fijos
-- Costa de Plata: b3b1107d-c614-4c02-80a1-14f1da4079bc
-- Los Olivos:     c05ade01-0000-0000-0000-000000000001
-- Admin Costa:    03232926-a120-453e-b97f-a7ab31dee839 (jodany)
-- Admin Olivos:   (carmen)

-- -------------------------------------------------------------------
-- INVOICES (marzo 2026 = todas pagadas; abril 2026 = mix)
-- -------------------------------------------------------------------

-- Costa de Plata: cuota $85 para apts, $120 para penthouses, $60 para locales
INSERT INTO invoices (organization_id, unit_id, amount, currency, description, due_date, status)
SELECT
  u.organization_id,
  u.id,
  CASE u.type WHEN 'penthouse' THEN 120 WHEN 'local' THEN 60 ELSE 85 END,
  'USD',
  'Cuota marzo 2026',
  '2026-03-15'::date,
  'paid'
FROM units u
WHERE u.organization_id = 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.unit_id = u.id AND i.description = 'Cuota marzo 2026'
  );

-- Abril Costa: 10 paid, 3 pending, 1 overdue
INSERT INTO invoices (organization_id, unit_id, amount, currency, description, due_date, status)
SELECT
  u.organization_id,
  u.id,
  CASE u.type WHEN 'penthouse' THEN 120 WHEN 'local' THEN 60 ELSE 85 END,
  'USD',
  'Cuota abril 2026',
  '2026-04-15'::date,
  CASE
    WHEN u.unit_number IN ('4-A', '3-B', 'PH-2') THEN 'pending'
    WHEN u.unit_number = 'L-2' THEN 'overdue'
    ELSE 'paid'
  END
FROM units u
WHERE u.organization_id = 'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.unit_id = u.id AND i.description = 'Cuota abril 2026'
  );

-- Los Olivos: cuota $120 para apts, $180 para penthouses
INSERT INTO invoices (organization_id, unit_id, amount, currency, description, due_date, status)
SELECT
  u.organization_id,
  u.id,
  CASE u.type WHEN 'penthouse' THEN 180 ELSE 120 END,
  'USD',
  'Cuota marzo 2026',
  '2026-03-15'::date,
  'paid'
FROM units u
WHERE u.organization_id = 'c05ade01-0000-0000-0000-000000000001'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.unit_id = u.id AND i.description = 'Cuota marzo 2026'
  );

-- Abril Olivos: mix de estados
INSERT INTO invoices (organization_id, unit_id, amount, currency, description, due_date, status)
SELECT
  u.organization_id,
  u.id,
  CASE u.type WHEN 'penthouse' THEN 180 ELSE 120 END,
  'USD',
  'Cuota abril 2026',
  '2026-04-15'::date,
  CASE
    WHEN u.unit_number IN ('T1-102','T2-301','T1-401') THEN 'pending'
    WHEN u.unit_number IN ('T2-402','T1-202') THEN 'overdue'
    ELSE 'paid'
  END
FROM units u
WHERE u.organization_id = 'c05ade01-0000-0000-0000-000000000001'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.unit_id = u.id AND i.description = 'Cuota abril 2026'
  );

-- -------------------------------------------------------------------
-- TRANSACTIONS (para invoices pagadas)
-- -------------------------------------------------------------------

INSERT INTO transactions (invoice_id, amount, currency, payment_method, reference, paid_at, status, currency_paid)
SELECT
  i.id,
  i.amount,
  i.currency,
  CASE (row_number() OVER (ORDER BY i.id))::int % 4
    WHEN 0 THEN 'pago_movil'
    WHEN 1 THEN 'transferencia'
    WHEN 2 THEN 'zelle'
    ELSE 'efectivo'
  END,
  'REF-' || substr(i.id::text, 1, 8),
  CASE
    WHEN i.description LIKE '%marzo%' THEN i.due_date - interval '3 days'
    ELSE i.due_date - interval '2 days'
  END,
  'approved',
  i.currency
FROM invoices i
WHERE i.status = 'paid'
  AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.invoice_id = i.id);

-- -------------------------------------------------------------------
-- EXPENSE RECORDS (gastos del mes)
-- -------------------------------------------------------------------

INSERT INTO expense_records (organization_id, category, description, amount, currency, expense_date, recorded_by)
VALUES
  -- Costa de Plata (admin Jodany registra)
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'vigilancia',    'Empresa Segurvip — mes marzo',        580.00, 'USD', '2026-03-05', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'mantenimiento', 'Reparacion bomba de agua',            350.00, 'USD', '2026-03-12', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'aseo',          'Servicio de limpieza quincenal',      200.00, 'USD', '2026-03-15', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'servicios',     'Electricidad areas comunes',          180.00, 'USD', '2026-04-03', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'vigilancia',    'Empresa Segurvip — mes abril',        580.00, 'USD', '2026-04-05', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'aseo',          'Productos de limpieza',                95.00, 'USD', '2026-04-10', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, 'mantenimiento', 'Pintura pasillos piso 3',             420.00, 'USD', '2026-04-18', '03232926-a120-453e-b97f-a7ab31dee839'::uuid),
  -- Los Olivos (admin Carmen registra)
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'vigilancia',    'Empresa Guardia Total — marzo',       850.00, 'USD', '2026-03-04', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'piscina',       'Quimicos piscina y mantenimiento',    280.00, 'USD', '2026-03-10', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'jardineria',    'Poda y fertilizacion jardines',       340.00, 'USD', '2026-03-14', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'servicios',     'Internet fibra areas comunes',         90.00, 'USD', '2026-04-02', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'vigilancia',    'Empresa Guardia Total — abril',       850.00, 'USD', '2026-04-04', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'mantenimiento', 'Reparacion ascensor T2',              680.00, 'USD', '2026-04-08', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test')),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, 'piscina',       'Calentador solar — revision anual',   220.00, 'USD', '2026-04-15', (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'))
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------
-- ANNOUNCEMENTS
-- -------------------------------------------------------------------

INSERT INTO announcements (organization_id, author_id, title, content, priority, target_audience, published_at)
VALUES
  -- Costa de Plata
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '03232926-a120-453e-b97f-a7ab31dee839'::uuid,
    'Corte de agua programado',
    'Estimados residentes, el dia sabado 26 de abril entre las 8am y 2pm se realizara mantenimiento de la cisterna principal. Favor almacenar agua.',
    'urgent', 'all', '2026-04-20 09:00:00'::timestamptz),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '03232926-a120-453e-b97f-a7ab31dee839'::uuid,
    'Asamblea ordinaria 15 de mayo',
    'Se convoca a todos los propietarios a la asamblea ordinaria anual. Agenda: aprobacion de balance, eleccion de junta, proyectos 2026.',
    'important', 'all', '2026-04-18 10:30:00'::timestamptz),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '03232926-a120-453e-b97f-a7ab31dee839'::uuid,
    'Nuevo horario de piscina',
    'A partir del 1 de mayo la piscina abrira de 7am a 9pm entre semana, 7am a 10pm fines de semana.',
    'normal', 'all', '2026-04-15 14:00:00'::timestamptz),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid, '03232926-a120-453e-b97f-a7ab31dee839'::uuid,
    'Recordatorio cuota de abril',
    'Les recordamos que la cuota de abril vencio el 15. Pueden pagar por Pago Movil, Zelle o transferencia. Consulten con administracion.',
    'normal', 'all', '2026-04-16 11:00:00'::timestamptz),
  -- Los Olivos
  ('c05ade01-0000-0000-0000-000000000001'::uuid, (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'),
    'Mantenimiento ascensor T2',
    'El ascensor de la Torre 2 estara fuera de servicio el 24 de abril desde las 9am. Se solicita usar el ascensor de la T1. Disculpen la molestia.',
    'urgent', 'all', '2026-04-21 08:00:00'::timestamptz),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'),
    'Dia del vecino — 5 de mayo',
    'Los invitamos a nuestro evento anual de convivencia. Parrillera, musica en vivo y actividades para los ninos. Inscripciones con administracion.',
    'important', 'all', '2026-04-19 16:00:00'::timestamptz),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'),
    'Nuevas camaras en parqueo',
    'Se instalaron 4 camaras adicionales en el area de parqueo visitantes. Monitoreo 24/7.',
    'normal', 'all', '2026-04-12 13:00:00'::timestamptz),
  ('c05ade01-0000-0000-0000-000000000001'::uuid, (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'),
    'Torneo de dominio el 30 de abril',
    'Desde el coworking se organiza torneo de dominio. Inscripcion gratis, premio simbolico.',
    'normal', 'all', '2026-04-17 18:00:00'::timestamptz)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------
-- MAINTENANCE REQUESTS
-- -------------------------------------------------------------------

INSERT INTO maintenance_requests (organization_id, unit_id, reported_by, title, description, category, priority, status, assigned_to, created_at)
VALUES
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    'ce57aa01-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='ana.torres@costa.atryum.test'),
    'Fuga de agua en bano principal',
    'Hay una fuga debajo del lavamanos desde el lunes. El agua se esta filtrando al piso inferior.',
    'plomeria', 'high', 'in_progress', 'Juan Plomero', '2026-04-18 10:00:00'::timestamptz),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    'ce57aa01-0000-0000-0000-000000000005'::uuid,
    (SELECT id FROM profiles WHERE email='pedro.ramos@costa.atryum.test'),
    'Ascensor se atasca en piso 3',
    'Desde ayer el ascensor hace ruido extrano y se detiene entre el 2 y 3.',
    'ascensor', 'urgent', 'in_review', 'Tecnico Elevatec', '2026-04-21 14:00:00'::timestamptz),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    NULL,
    (SELECT id FROM profiles WHERE email='elena.morales@costa.atryum.test'),
    'Bombilla fundida en pasillo piso 3',
    'El pasillo queda muy oscuro de noche, la bombilla del fondo esta fundida.',
    'electricidad', 'low', 'new', NULL, '2026-04-22 08:30:00'::timestamptz),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    'ce57aa01-0000-0000-0000-000000000009'::uuid,
    (SELECT id FROM profiles WHERE email='roberto.paz@costa.atryum.test'),
    'Filtracion techo PH',
    'Con las ultimas lluvias hay humedad en el techo. Revisar antes que empeore.',
    'estructura', 'high', 'new', NULL, '2026-04-21 19:00:00'::timestamptz),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    'ce57aa01-0000-0000-0000-000000000002'::uuid,
    (SELECT id FROM profiles WHERE email='carlos.perez@costa.atryum.test'),
    'Puerta de entrada no cierra bien',
    'El pestillo esta desgastado, la puerta del apartamento queda floja.',
    'cerrajeria', 'medium', 'resolved', 'Cerrajeria 24h', '2026-04-10 11:00:00'::timestamptz),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    NULL,
    (SELECT id FROM profiles WHERE email='maria.rodriguez@costa.atryum.test'),
    'Goteras en techo de parrillera',
    'La parrillera comun tiene goteras cuando llueve fuerte.',
    'estructura', 'medium', 'in_progress', 'Constructora Torres', '2026-04-14 16:00:00'::timestamptz),
  -- Los Olivos
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    '011ce501-0000-0000-0000-000000000004'::uuid,
    (SELECT id FROM profiles WHERE email='silvia.nieto@olivos.atryum.test'),
    'Aire acondicionado no enfria',
    'El aire del salon principal no esta enfriando. Posible fuga de gas.',
    'climatizacion', 'high', 'in_progress', 'Freon Servicios', '2026-04-19 13:00:00'::timestamptz),
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    NULL,
    (SELECT id FROM profiles WHERE email='juan.acosta@olivos.atryum.test'),
    'Cancha multiuso: iluminacion falla',
    'Las luces se apagan solas despues de 20 minutos.',
    'electricidad', 'medium', 'new', NULL, '2026-04-20 20:00:00'::timestamptz),
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    '011ce501-0000-0000-0000-000000000011'::uuid,
    (SELECT id FROM profiles WHERE email='andres.iriarte@olivos.atryum.test'),
    'Llave de cocina gotea',
    'La llave gotea constantemente, hay que cambiar el empaque.',
    'plomeria', 'low', 'new', NULL, '2026-04-22 09:00:00'::timestamptz),
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    NULL,
    (SELECT id FROM profiles WHERE email='lucia.bravo@olivos.atryum.test'),
    'Gimnasio: caminadora descompuesta',
    'La caminadora del fondo hace un ruido fuerte al usar. Sugieren suspender su uso.',
    'equipos', 'high', 'in_review', 'Fitness Tech', '2026-04-20 08:00:00'::timestamptz),
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    '011ce501-0000-0000-0000-000000000014'::uuid,
    (SELECT id FROM profiles WHERE email='rafael.kuntz@olivos.atryum.test'),
    'Plaga de hormigas en cocina',
    'Hormigas en la cocina, entraron por la ventana.',
    'plagas', 'medium', 'resolved', 'Fumigadora Sierra', '2026-04-05 10:00:00'::timestamptz),
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    NULL,
    (SELECT id FROM profiles WHERE email='gabriela.leon@olivos.atryum.test'),
    'Puerta peatonal torre 2 no cierra',
    'El raton mecanico esta flojo, la puerta no se cierra sola.',
    'cerrajeria', 'high', 'in_progress', 'Cerrajeria Express', '2026-04-16 15:00:00'::timestamptz)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------
-- RESERVATIONS
-- -------------------------------------------------------------------

INSERT INTO reservations (common_area_id, reserved_by, start_time, end_time, status, notes)
VALUES
  -- Costa de Plata
  ('ca0a0001-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='ana.torres@costa.atryum.test'),
    '2026-04-26 18:00:00'::timestamptz, '2026-04-26 23:00:00'::timestamptz,
    'confirmed', 'Cumpleanos infantil'),
  ('ca0a0001-0000-0000-0000-000000000004'::uuid,
    (SELECT id FROM profiles WHERE email='carlos.perez@costa.atryum.test'),
    '2026-04-27 12:00:00'::timestamptz, '2026-04-27 17:00:00'::timestamptz,
    'confirmed', 'Parrillada familiar'),
  ('ca0a0001-0000-0000-0000-000000000003'::uuid,
    (SELECT id FROM profiles WHERE email='diego.silva@costa.atryum.test'),
    '2026-04-24 06:00:00'::timestamptz, '2026-04-24 07:30:00'::timestamptz,
    'confirmed', 'Entrenamiento'),
  ('ca0a0001-0000-0000-0000-000000000002'::uuid,
    (SELECT id FROM profiles WHERE email='elena.morales@costa.atryum.test'),
    '2026-04-25 14:00:00'::timestamptz, '2026-04-25 17:00:00'::timestamptz,
    'confirmed', 'Celebracion graduacion (pendiente confirmar)'),
  ('ca0a0001-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='sofia.linares@costa.atryum.test'),
    '2026-04-10 19:00:00'::timestamptz, '2026-04-10 23:00:00'::timestamptz,
    'confirmed', 'Evento pasado'),
  -- Los Olivos
  ('ca0b0001-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='valentina.h@olivos.atryum.test'),
    '2026-04-30 19:00:00'::timestamptz, '2026-04-30 23:30:00'::timestamptz,
    'confirmed', 'Baby shower'),
  ('ca0b0001-0000-0000-0000-000000000002'::uuid,
    (SELECT id FROM profiles WHERE email='paula.duran@olivos.atryum.test'),
    '2026-04-28 10:00:00'::timestamptz, '2026-04-28 14:00:00'::timestamptz,
    'confirmed', 'Dia de piscina familiar'),
  ('ca0b0001-0000-0000-0000-000000000005'::uuid,
    (SELECT id FROM profiles WHERE email='tomas.guzman@olivos.atryum.test'),
    '2026-04-24 09:00:00'::timestamptz, '2026-04-24 12:00:00'::timestamptz,
    'confirmed', 'Reunion de trabajo'),
  ('ca0b0001-0000-0000-0000-000000000004'::uuid,
    (SELECT id FROM profiles WHERE email='juan.acosta@olivos.atryum.test'),
    '2026-04-29 16:00:00'::timestamptz, '2026-04-29 18:00:00'::timestamptz,
    'confirmed', 'Futbol con amigos'),
  ('ca0b0001-0000-0000-0000-000000000003'::uuid,
    (SELECT id FROM profiles WHERE email='miguel.campo@olivos.atryum.test'),
    '2026-04-25 07:00:00'::timestamptz, '2026-04-25 08:30:00'::timestamptz,
    'confirmed', 'Entrenamiento matutino'),
  ('ca0b0001-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='ines.fernandez@olivos.atryum.test'),
    '2026-04-12 18:00:00'::timestamptz, '2026-04-12 22:00:00'::timestamptz,
    'confirmed', 'Cumple cerrado')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------
-- POLLS (1 open + 1 closed por org)
-- -------------------------------------------------------------------

INSERT INTO polls (id, organization_id, created_by, question, options, is_open, ends_at)
VALUES
  ('ba0a0001-0000-0000-0000-000000000001'::uuid,
    'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    '03232926-a120-453e-b97f-a7ab31dee839'::uuid,
    'Proyecto 2026: que priorizar?',
    '["Renovar piscina", "Modernizar gimnasio", "Instalar paneles solares", "Remodelar lobby"]'::jsonb,
    true, '2026-05-10 23:59:00'::timestamptz),
  ('ba0a0001-0000-0000-0000-000000000002'::uuid,
    'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    '03232926-a120-453e-b97f-a7ab31dee839'::uuid,
    'Nuevo horario piscina aprobado?',
    '["Si, horario extendido", "No, mantener actual"]'::jsonb,
    false, '2026-04-15 23:59:00'::timestamptz),
  ('ba0b0001-0000-0000-0000-000000000001'::uuid,
    'c05ade01-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'),
    'Dia del vecino: que actividad principal?',
    '["Parrillada con DJ", "Torneo deportivo", "Cine al aire libre", "Feria gastronomica"]'::jsonb,
    true, '2026-04-28 23:59:00'::timestamptz),
  ('ba0b0001-0000-0000-0000-000000000002'::uuid,
    'c05ade01-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='admin.olivos@atryum.test'),
    'Aumentar fondo de reserva?',
    '["Si, subir a $25", "No, mantener $20"]'::jsonb,
    false, '2026-03-31 23:59:00'::timestamptz)
ON CONFLICT (id) DO NOTHING;

-- poll_votes (voto del poll cerrado Costa)
INSERT INTO poll_votes (poll_id, voter_id, selected_option)
SELECT 'ba0a0001-0000-0000-0000-000000000002'::uuid, p.id, 'Si, horario extendido'
FROM profiles p
WHERE p.email IN ('ana.torres@costa.atryum.test','carlos.perez@costa.atryum.test','elena.morales@costa.atryum.test','diego.silva@costa.atryum.test','sofia.linares@costa.atryum.test','roberto.paz@costa.atryum.test')
ON CONFLICT DO NOTHING;

INSERT INTO poll_votes (poll_id, voter_id, selected_option)
SELECT 'ba0a0001-0000-0000-0000-000000000002'::uuid, p.id, 'No, mantener actual'
FROM profiles p
WHERE p.email IN ('luis.gomez@costa.atryum.test','maria.rodriguez@costa.atryum.test')
ON CONFLICT DO NOTHING;

-- poll votes Olivos cerrado
INSERT INTO poll_votes (poll_id, voter_id, selected_option)
SELECT 'ba0b0001-0000-0000-0000-000000000002'::uuid, p.id, 'Si, subir a $25'
FROM profiles p
WHERE p.email IN ('juan.acosta@olivos.atryum.test','lucia.bravo@olivos.atryum.test','miguel.campo@olivos.atryum.test','paula.duran@olivos.atryum.test','jorge.estevez@olivos.atryum.test','ines.fernandez@olivos.atryum.test','tomas.guzman@olivos.atryum.test','valentina.h@olivos.atryum.test')
ON CONFLICT DO NOTHING;

INSERT INTO poll_votes (poll_id, voter_id, selected_option)
SELECT 'ba0b0001-0000-0000-0000-000000000002'::uuid, p.id, 'No, mantener $20'
FROM profiles p
WHERE p.email IN ('andres.iriarte@olivos.atryum.test','camila.juarez@olivos.atryum.test','rafael.kuntz@olivos.atryum.test')
ON CONFLICT DO NOTHING;

-- Algunos votos ya en el poll abierto Costa (para mostrar progreso)
INSERT INTO poll_votes (poll_id, voter_id, selected_option)
SELECT 'ba0a0001-0000-0000-0000-000000000001'::uuid, p.id, 'Renovar piscina'
FROM profiles p
WHERE p.email IN ('ana.torres@costa.atryum.test','carlos.perez@costa.atryum.test')
ON CONFLICT DO NOTHING;

INSERT INTO poll_votes (poll_id, voter_id, selected_option)
SELECT 'ba0a0001-0000-0000-0000-000000000001'::uuid, p.id, 'Instalar paneles solares'
FROM profiles p
WHERE p.email IN ('elena.morales@costa.atryum.test','diego.silva@costa.atryum.test','sofia.linares@costa.atryum.test')
ON CONFLICT DO NOTHING;

INSERT INTO poll_votes (poll_id, voter_id, selected_option)
SELECT 'ba0a0001-0000-0000-0000-000000000001'::uuid, p.id, 'Modernizar gimnasio'
FROM profiles p
WHERE p.email IN ('roberto.paz@costa.atryum.test','maria.rodriguez@costa.atryum.test')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------
-- ACCESS PASSES (QR visitantes)
-- -------------------------------------------------------------------

INSERT INTO access_passes (organization_id, created_by, visitor_name, visitor_id_number, qr_code, valid_from, valid_until, unit_number, status)
VALUES
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    (SELECT id FROM profiles WHERE email='ana.torres@costa.atryum.test'),
    'Maria Garcia Lopez', 'V-18456789',
    'COS-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-22 08:00:00'::timestamptz, '2026-04-22 20:00:00'::timestamptz, '1-A', 'active'),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    (SELECT id FROM profiles WHERE email='carlos.perez@costa.atryum.test'),
    'Jose Luis Salazar', 'V-12345678',
    'COS-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-22 10:00:00'::timestamptz, '2026-04-22 18:00:00'::timestamptz, '1-B', 'active'),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    (SELECT id FROM profiles WHERE email='elena.morales@costa.atryum.test'),
    'Luisa Fernanda Vera', 'V-22334455',
    'COS-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-20 15:00:00'::timestamptz, '2026-04-20 22:00:00'::timestamptz, '3-B', 'used'),
  ('b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    (SELECT id FROM profiles WHERE email='diego.silva@costa.atryum.test'),
    'Carlos Ramirez', 'V-16789012',
    'COS-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-23 09:00:00'::timestamptz, '2026-04-23 19:00:00'::timestamptz, '4-A', 'active'),
  -- Los Olivos
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='juan.acosta@olivos.atryum.test'),
    'Patricia Gonzalez', 'V-19876543',
    'OLI-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-22 12:00:00'::timestamptz, '2026-04-22 22:00:00'::timestamptz, 'T1-101', 'active'),
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='valentina.h@olivos.atryum.test'),
    'Miguel Angel Paredes', 'V-15432109',
    'OLI-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-21 16:00:00'::timestamptz, '2026-04-21 23:00:00'::timestamptz, 'T2-101', 'used'),
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='paula.duran@olivos.atryum.test'),
    'Roberto Arias', 'V-25678901',
    'OLI-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-23 14:00:00'::timestamptz, '2026-04-23 20:00:00'::timestamptz, 'T1-301', 'active'),
  ('c05ade01-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM profiles WHERE email='tomas.guzman@olivos.atryum.test'),
    'Ana Sofia Mendez', 'V-14567890',
    'OLI-QR-' || substr(md5(random()::text), 1, 12),
    '2026-04-24 08:00:00'::timestamptz, '2026-04-24 18:00:00'::timestamptz, 'T2-101', 'active')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------
-- ASSEMBLIES (programada + una pasada)
-- -------------------------------------------------------------------

INSERT INTO assemblies (id, organization_id, title, description, scheduled_at, status, quorum_required)
VALUES
  ('a55e3b11-0000-0000-0000-000000000001'::uuid,
    'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    'Asamblea ordinaria 2026',
    'Aprobacion de balance, eleccion de junta de vecinos, proyectos prioritarios 2026.',
    '2026-05-15 19:00:00'::timestamptz, 'scheduled', 50),
  ('a55e3b11-0000-0000-0000-000000000002'::uuid,
    'b3b1107d-c614-4c02-80a1-14f1da4079bc'::uuid,
    'Asamblea extraordinaria abril',
    'Decision sobre cambio de empresa de vigilancia.',
    '2026-04-05 18:30:00'::timestamptz, 'completed', 50),
  ('a55e3b11-0000-0000-0000-000000000003'::uuid,
    'c05ade01-0000-0000-0000-000000000001'::uuid,
    'Asamblea anual Los Olivos',
    'Revision de gestion 2025-2026 y propuestas de inversion.',
    '2026-05-20 19:00:00'::timestamptz, 'scheduled', 60)
ON CONFLICT (id) DO NOTHING;

COMMIT;
