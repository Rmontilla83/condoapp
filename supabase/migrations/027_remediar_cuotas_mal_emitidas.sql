-- 027 · Remediación de cuotas mal emitidas
--
-- Corrige daño real en producción causado por dos bugs que ya están arreglados
-- en código pero cuyo efecto quedó grabado en los datos:
--
--   1) by_aliquot calculaba `base * aliquot / 100`. Con alícuotas que no suman
--      100% eso cobra el excedente. Costa (Σ=106,2%) cobró $5.522,40 en vez de
--      $5.200; Olivos (Σ=113%) cobró $1.130 en vez de $1.000.
--      Fix en código: distributeExact() en src/lib/cobranza/compute-invoices.ts
--
--   2) El guard anti-duplicados de generateInvoices comparaba la descripción con
--      `.eq()` (case-sensitive), así que un doble submit con 89 s de diferencia
--      creó dos veces la misma derrama ("Reparacion..." vs "reparacion...").
--
-- Los montos nuevos salen de reimplementar distributeExact() sobre los mismos
-- datos, así que coinciden al centavo con lo que la app generaría hoy.
-- Las facturas ya PAGADAS no se tocan (Olivos T2-101 pagó $52,00 cuando le
-- correspondían $46,02: quedan $5,98 a favor para acreditar).


UPDATE invoices SET amount = 665.93, updated_at = now() WHERE id = 'cd0b89e6-5ea1-4651-997f-da9c3d53386b';  -- PH-1: 707.20 -> 665.93
UPDATE invoices SET amount = 665.91, updated_at = now() WHERE id = '397ff0d1-a27b-4f06-aef6-f1341023a2f3';  -- PH-2: 707.20 -> 665.91
UPDATE invoices SET amount = 406.40, updated_at = now() WHERE id = 'dc2631f8-50c5-40a5-82da-084cbbc62d55';  -- 5-A: 431.60 -> 406.40
UPDATE invoices SET amount = 406.40, updated_at = now() WHERE id = '6b7ad884-4531-425c-bd8e-f9b0e0d8ac67';  -- 5-B: 431.60 -> 406.40
UPDATE invoices SET amount = 352.54, updated_at = now() WHERE id = '05e8861b-d490-42cc-9808-6bdd88bf7e61';  -- 3-A: 374.40 -> 352.54
UPDATE invoices SET amount = 352.54, updated_at = now() WHERE id = '824e7559-a1a8-4ac0-a82e-36813efa9018';  -- 3-B: 374.40 -> 352.54
UPDATE invoices SET amount = 352.54, updated_at = now() WHERE id = 'ce11ed50-22e2-458c-a58f-d0efd4936a49';  -- 4-A: 374.40 -> 352.54
UPDATE invoices SET amount = 352.54, updated_at = now() WHERE id = '047c8d3c-ecf4-4482-b70b-f649469cae94';  -- 4-B: 374.40 -> 352.54
UPDATE invoices SET amount = 318.27, updated_at = now() WHERE id = '8b158caa-f08e-4d9a-86ef-f5bbecd61de0';  -- 1-A: 338.00 -> 318.27
UPDATE invoices SET amount = 318.27, updated_at = now() WHERE id = '6ec26998-404b-41b4-9b78-9b7a8a6bdec6';  -- 1-B: 338.00 -> 318.27
UPDATE invoices SET amount = 318.27, updated_at = now() WHERE id = 'd2c9b776-326d-402e-8f30-2e4697f2ba7e';  -- 2-A: 338.00 -> 318.27
UPDATE invoices SET amount = 318.27, updated_at = now() WHERE id = '4ff59475-3fd4-44ba-b260-a04d9fa59798';  -- 2-B: 338.00 -> 318.27
UPDATE invoices SET amount = 186.06, updated_at = now() WHERE id = '42db7f25-8b7d-4cd2-ae22-06a7c593b9e4';  -- L-1: 197.60 -> 186.06
UPDATE invoices SET amount = 186.06, updated_at = now() WHERE id = '479e4eeb-5a09-4d5c-a634-1564dcecc32e';  -- L-2: 197.60 -> 186.06
UPDATE invoices SET amount = 100.00, updated_at = now() WHERE id = 'f003a0f8-0b41-4bca-939f-2b48e1c9ac31';  -- PH-OLI-1: 113.00 -> 100.00
UPDATE invoices SET amount = 100.00, updated_at = now() WHERE id = 'df2a7487-05f4-4443-a139-a40f9af859c6';  -- PH-OLI-2: 113.00 -> 100.00
UPDATE invoices SET amount = 53.98, updated_at = now() WHERE id = 'd5a77ed4-0a2c-4643-a301-2d6150e75143';  -- T1-301: 61.00 -> 53.98
UPDATE invoices SET amount = 53.98, updated_at = now() WHERE id = 'e4c53320-db41-499d-95b8-14d4a72d65cf';  -- T1-302: 61.00 -> 53.98
UPDATE invoices SET amount = 53.98, updated_at = now() WHERE id = '030bfc67-0bc4-4f88-9312-b1480671a2fd';  -- T1-401: 61.00 -> 53.98
UPDATE invoices SET amount = 53.98, updated_at = now() WHERE id = 'be139eda-b19e-4864-8a26-ceaed95c4559';  -- T1-402: 61.00 -> 53.98
UPDATE invoices SET amount = 53.98, updated_at = now() WHERE id = 'a551768e-f1ce-407f-9223-d33907932836';  -- T2-301: 61.00 -> 53.98
UPDATE invoices SET amount = 53.98, updated_at = now() WHERE id = '7ce11268-6af7-4803-995b-2711f7f5ba6f';  -- T2-302: 61.00 -> 53.98
UPDATE invoices SET amount = 53.98, updated_at = now() WHERE id = '5e4cbbb5-6a84-4ba4-a8f3-8a691856cab5';  -- T2-401: 61.00 -> 53.98
UPDATE invoices SET amount = 53.98, updated_at = now() WHERE id = 'e07915c2-28dc-450b-9575-54d2a4689480';  -- T2-402: 61.00 -> 53.98
UPDATE invoices SET amount = 46.02, updated_at = now() WHERE id = 'a1356797-ac89-43c4-acfb-552b4e3bafee';  -- T1-101: 52.00 -> 46.02
UPDATE invoices SET amount = 46.02, updated_at = now() WHERE id = 'e7efb787-7b72-4228-88c4-971fd317587b';  -- T1-102: 52.00 -> 46.02
UPDATE invoices SET amount = 46.02, updated_at = now() WHERE id = 'aaea692b-9894-415d-a732-dfd38de13c79';  -- T1-201: 52.00 -> 46.02
UPDATE invoices SET amount = 46.02, updated_at = now() WHERE id = '752fc31b-56ed-49c7-a29e-1a6609c446de';  -- T1-202: 52.00 -> 46.02
UPDATE invoices SET amount = 46.02, updated_at = now() WHERE id = 'bb6e2523-80a6-4704-9eb9-b674913c160a';  -- T2-102: 52.00 -> 46.02
UPDATE invoices SET amount = 46.02, updated_at = now() WHERE id = '342964a1-f714-4e46-aed3-ac29afad0b2e';  -- T2-201: 52.00 -> 46.02
UPDATE invoices SET amount = 46.02, updated_at = now() WHERE id = '07ee3c64-95a4-432b-89de-982676e49b58';  -- T2-202: 52.00 -> 46.02

-- Anular la tanda duplicada (la segunda, creada 89s después de la primera)
UPDATE invoices SET status = 'cancelled', updated_at = now()
 WHERE id IN ('b18c2f60-86d5-41da-b188-37db44c0d05a', 'cace3ffe-907c-4553-a565-09db3bfc82ab', 'fb184a92-ade9-4633-b252-49d19423dddf', 'dc408d1d-2459-4d6d-b641-6cb8387ef17c', '5e1b8563-c110-4650-a1bf-999a222826f6', '01fc26e4-8d77-4104-9599-0e54ba797867', '3147492f-5efb-4b2d-854b-37f5d44594f8', '15a2ab10-2a1c-4b03-9e8e-22e7adcbd0d6', '7f49f555-c12a-4a52-8db9-d936da32ecfe', '07e550a4-8806-4232-9a5c-c999110e0555', '3d8c371b-2cd4-4322-b8ae-afee925eab0d', '01f339d4-c099-49a8-82bc-11844c1a0bfa', 'da06934b-0eac-4cd1-970c-e2b56c103f15', '4d32a179-167d-43f8-a24f-368c3e91811a');

-- Rechazar el/los comprobante(s) que colgaban de la tanda anulada
UPDATE transactions SET status = 'rejected'
 WHERE id IN ('2a14b551-43df-4283-bec0-5d8fac3bb4d6');

-- Verificación (debe dar 5200.00 y 1000.00):
-- SELECT description, SUM(amount) FROM invoices
--  WHERE description IN ('Cuota Mayo 2026','Cuota de MArzo 2026') GROUP BY 1;

