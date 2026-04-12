-- CondoApp Seed Data
-- Organización de prueba con unidades, invoices, anuncios, mantenimiento

-- 1. Organización
INSERT INTO organizations (id, name, address, city, country, currency, timezone)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Residencias Los Robles',
  'Av. Principal, Edif. Los Robles',
  'Caracas',
  'VE',
  'USD',
  'America/Caracas'
) ON CONFLICT (id) DO NOTHING;

-- 2. Unidades (12 apartamentos)
INSERT INTO units (id, organization_id, unit_number, floor, block, type, aliquot) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '1-A', 1, 'A', 'apartment', 8.33),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '1-B', 1, 'A', 'apartment', 8.33),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '2-A', 2, 'A', 'apartment', 8.33),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '2-B', 2, 'A', 'apartment', 8.33),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '3-A', 3, 'A', 'apartment', 8.33),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '3-B', 3, 'A', 'apartment', 8.33),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '4-A', 4, 'A', 'apartment', 8.33),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', '4-B', 4, 'A', 'apartment', 8.33),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'PH-A', 5, 'A', 'penthouse', 8.33),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'PH-B', 5, 'A', 'penthouse', 8.37),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'L-1', 0, 'A', 'local', 4.00),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'L-2', 0, 'A', 'local', 4.00)
ON CONFLICT (id) DO NOTHING;

-- 3. Fee breakdown (desglose de cuota mensual)
INSERT INTO fee_breakdown (id, organization_id, concept, amount) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Mantenimiento general', 45.00),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Fondo de reserva', 15.00),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Seguridad', 15.00),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Areas comunes', 10.00)
ON CONFLICT (id) DO NOTHING;

-- 4. Invoices para las primeras 6 unidades (Marzo y Abril 2026)
INSERT INTO invoices (id, organization_id, unit_id, amount, currency, description, due_date, status) VALUES
  -- Marzo - todas pagadas
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 85.00, 'USD', 'Cuota marzo 2026', '2026-03-15', 'paid'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 85.00, 'USD', 'Cuota marzo 2026', '2026-03-15', 'paid'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 85.00, 'USD', 'Cuota marzo 2026', '2026-03-15', 'paid'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 85.00, 'USD', 'Cuota marzo 2026', '2026-03-15', 'overdue'),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 85.00, 'USD', 'Cuota marzo 2026', '2026-03-15', 'paid'),
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 85.00, 'USD', 'Cuota marzo 2026', '2026-03-15', 'overdue'),
  -- Abril - mix de estados
  ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 85.00, 'USD', 'Cuota abril 2026', '2026-04-15', 'paid'),
  ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 85.00, 'USD', 'Cuota abril 2026', '2026-04-15', 'pending'),
  ('d0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 85.00, 'USD', 'Cuota abril 2026', '2026-04-15', 'pending'),
  ('d0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 85.00, 'USD', 'Cuota abril 2026', '2026-04-15', 'pending'),
  ('d0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 85.00, 'USD', 'Cuota abril 2026', '2026-04-15', 'paid'),
  ('d0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 85.00, 'USD', 'Cuota abril 2026', '2026-04-15', 'pending')
ON CONFLICT (id) DO NOTHING;

-- 5. Transactions para invoices pagados
INSERT INTO transactions (id, invoice_id, amount, currency, payment_method, reference, paid_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 85.00, 'USD', 'transfer', 'REF-001-MAR', '2026-03-10'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 85.00, 'USD', 'transfer', 'REF-002-MAR', '2026-03-12'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 85.00, 'USD', 'mobile_payment', 'REF-003-MAR', '2026-03-14'),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', 85.00, 'USD', 'transfer', 'REF-005-MAR', '2026-03-11'),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000007', 85.00, 'USD', 'transfer', 'REF-001-ABR', '2026-04-08'),
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000011', 85.00, 'USD', 'mobile_payment', 'REF-005-ABR', '2026-04-09')
ON CONFLICT (id) DO NOTHING;

-- 6. Announcements
INSERT INTO announcements (id, organization_id, author_id, title, content, priority, target_audience, published_at) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b82877ff-b76e-41dc-95f1-db77e9ba1e72',
   'Mantenimiento del ascensor',
   'Se realizara mantenimiento preventivo del ascensor el dia sabado 19 de abril de 8am a 12pm. Por favor usar las escaleras durante ese horario.',
   'important', 'all', '2026-04-10'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b82877ff-b76e-41dc-95f1-db77e9ba1e72',
   'Reunion de condominos - Abril',
   'Se convoca a asamblea ordinaria para el dia 25 de abril a las 7pm en el salon de eventos. Agenda: presupuesto Q2, jardineria, seguridad.',
   'urgent', 'all', '2026-04-08'),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b82877ff-b76e-41dc-95f1-db77e9ba1e72',
   'Nuevos horarios del gimnasio',
   'A partir del 1 de mayo, el gimnasio estara disponible de 5am a 10pm de lunes a sabado, y de 7am a 8pm los domingos.',
   'normal', 'all', '2026-04-05'),
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b82877ff-b76e-41dc-95f1-db77e9ba1e72',
   'Fumigacion programada',
   'El proximo miercoles 16 de abril se realizara fumigacion en areas comunes y estacionamiento. Se recomienda mantener ventanas cerradas de 9am a 11am.',
   'important', 'all', '2026-04-03')
ON CONFLICT (id) DO NOTHING;

-- 7. Common areas
INSERT INTO common_areas (id, organization_id, name, description, capacity) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Salon de Eventos', 'Salon con capacidad para reuniones y celebraciones', 50),
  ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Gimnasio', 'Gimnasio equipado', 15),
  ('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Area BBQ', 'Parrillera con mesas y sillas', 20),
  ('a1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Piscina', 'Piscina con area de descanso', 30)
ON CONFLICT (id) DO NOTHING;

-- 8. Expense records
INSERT INTO expense_records (id, organization_id, category, description, amount, currency, expense_date) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Mantenimiento', 'Reparacion bomba de agua', 350.00, 'USD', '2026-03-20'),
  ('a2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Limpieza', 'Servicio de limpieza mensual - Marzo', 200.00, 'USD', '2026-03-31'),
  ('a2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Seguridad', 'Pago vigilancia - Marzo', 450.00, 'USD', '2026-03-31'),
  ('a2000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Servicios', 'Electricidad areas comunes - Marzo', 180.00, 'USD', '2026-03-28')
ON CONFLICT (id) DO NOTHING;

-- 9. Assign test user as admin of the org + link to unit 1-A
UPDATE profiles
SET organization_id = 'a0000000-0000-0000-0000-000000000001',
    role = 'admin',
    full_name = 'Rafael Montilla'
WHERE id = 'b82877ff-b76e-41dc-95f1-db77e9ba1e72';

INSERT INTO unit_residents (unit_id, profile_id, is_owner)
VALUES ('b0000000-0000-0000-0000-000000000001', 'b82877ff-b76e-41dc-95f1-db77e9ba1e72', true)
ON CONFLICT (unit_id, profile_id) DO NOTHING;

-- 10. Maintenance requests (reported by test user)
INSERT INTO maintenance_requests (id, organization_id, unit_id, reported_by, title, description, category, priority, status, assigned_to) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'b82877ff-b76e-41dc-95f1-db77e9ba1e72', 'Fuga de agua en el bano',
   'Hay una fuga en la tuberia debajo del lavamanos del bano principal. Gotea constantemente.',
   'plumbing', 'high', 'in_progress', 'Juan Plomero'),
  ('a3000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'b82877ff-b76e-41dc-95f1-db77e9ba1e72', 'Luz del pasillo fundida',
   'La luz del pasillo del piso 1 lleva una semana sin funcionar.',
   'electrical', 'low', 'new', NULL),
  ('a3000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'b82877ff-b76e-41dc-95f1-db77e9ba1e72', 'Puerta del estacionamiento no abre',
   'El control remoto de la puerta del estacionamiento dejo de funcionar. Hay que abrir manualmente.',
   'access', 'urgent', 'in_review', NULL)
ON CONFLICT (id) DO NOTHING;
