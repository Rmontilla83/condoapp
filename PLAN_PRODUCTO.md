# Plan de producto Atryum — núcleo curado

**Fecha:** 2026-04-28
**Premisa:** este plan reemplaza el scope inflado de `AUDITORIA_FUNCIONAL.md`. Aquí están solo las **5 épicas mínimas** para que la app sea coherente con su propia promesa. Lo demás espera.

**Reglas de ejecución (no negociables):**
1. Una épica = una rama = una serie de PRs cohesivos. No mezclar épicas.
2. **Toda PR que agregue algo, borra el equivalente viejo.** No coexistencia. No "luego limpiamos".
3. Antes de cada épica: `EnterPlanMode` + `/plan-eng-review`. Antes de épicas con UI seria: también `/plan-design-review`.
4. Cada épica se cierra con: migration aplicada en Supabase, code shipping en producción, memoria actualizada.
5. Las épicas se ejecutan en el orden listado. La E1 desbloquea las demás.

---

## Épica 1 — Cobranza coherente

**Por qué primero:** sin esto la app no resuelve el problema central. Es el "plomo" del producto. Hoy el dialog "Generar cuotas" aplica el mismo monto a TODAS las unidades, y los chips "Stripe / Débito Inmediato" en /pagos son texto estático que miente al residente.

### Estado actual

- `condoapp/src/app/(dashboard)/admin/admin-actions.ts` `generateMonthlyInvoices` — 1 monto plano para todas las unidades. Ignora `units.aliquot`, `units.type`, y `fee_breakdown`.
- `condoapp/src/app/(dashboard)/admin/generate-invoices-dialog.tsx` — formulario con un solo input "Monto por unidad".
- `condoapp/src/app/(dashboard)/pagos/page.tsx` líneas ~104-126 — bloque "Métodos disponibles" con 3 chips estáticos sin acción.
- `condoapp/src/app/(dashboard)/pagos/pay-dialog.tsx` — un dialog por invoice. Sin multi-pago.
- `condoapp/src/app/(dashboard)/pagos/pay-dialog.tsx` botón "Reportar pago" — copy engañoso.
- `condoapp/src/app/(dashboard)/admin/settings/page.tsx` — solo 3 toggles. Sin datos bancarios. Sin editor de `fee_breakdown`.
- `fee_breakdown` tabla existe y se renderiza en /pagos como "Desglose mensual" pero **nunca se usa** como fuente al generar invoices.
- `invoices` schema ya tiene `currency`, `exchange_rate`, `amount_bs` (migration 007). No hace falta tocar el core.

### Qué cambia

**Schema (migration 016_fee_modes.sql):**
```sql
ALTER TABLE organizations
  ADD COLUMN fee_mode TEXT NOT NULL DEFAULT 'flat'
    CHECK (fee_mode IN ('flat', 'by_aliquot', 'by_type', 'manual')),
  ADD COLUMN bank_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN late_fee_pct NUMERIC(5,2) DEFAULT NULL;

ALTER TABLE invoices
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'monthly'
    CHECK (kind IN ('monthly', 'extraordinary'));

CREATE TABLE fee_type_amounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  UNIQUE(organization_id, unit_type)
);
```

**Server actions (refactor `admin-actions.ts`):**
- `generateMonthlyInvoices(formData)` → recibe `{ kind, mode, period, due_date, total_budget?, type_amounts?, manual_amounts? }` y calcula por unidad según `mode`.
- Nueva: `generateExtraordinaryInvoices(formData)` — derramas. Mismo cálculo pero `kind='extraordinary'`.
- Nueva: `submitPaymentForMultipleInvoices(formData)` — un comprobante cubre N invoices, crea N transactions vinculadas con shared `reference`.

**UI nueva:**
- `condoapp/src/app/(dashboard)/admin/generate-invoices-dialog.tsx` rediseñado: stepper de 4 pasos (kind → period → mode → preview).
- `condoapp/src/app/(dashboard)/admin/settings/bank-accounts-form.tsx` (nuevo) — CRUD de cuentas: banco, número, RIF, beneficiario, tipo (transferencia / pago_movil / zelle).
- `condoapp/src/app/(dashboard)/admin/settings/fee-config-form.tsx` (nuevo) — selector de `fee_mode`, montos por tipo, late fee, editor de `fee_breakdown` (concepts).
- `condoapp/src/app/(dashboard)/pagos/payment-methods.tsx` (nuevo) — render dinámico de `org.bank_accounts` con tap-to-copy.
- `condoapp/src/app/(dashboard)/pagos/multi-pay-dialog.tsx` (nuevo) — selección múltiple + un solo comprobante.

**Copy:**
- "Reportar pago" → "Subir comprobante" en todos los lados.

### Qué se borra

- ❌ Bloque "Métodos disponibles" en `pagos/page.tsx` líneas ~104-126 (chips estáticos).
- ❌ `pay-dialog.tsx` queda solo para casos de invoice única (o se elimina si decidimos que multi-pay maneja también el caso n=1).
- ❌ Texto "Reportar pago" en cualquier botón / DialogTrigger / título.
- ❌ Lógica `amount = parseFloat(formData.get("amount"))` en `generateMonthlyInvoices`. El monto plano deja de existir como concepto único.

### Migración paso a paso

1. PR #1 — Migration 016 + schema types regen + bank_accounts CRUD en settings (sin tocar /pagos todavía).
2. PR #2 — Refactor `generateMonthlyInvoices` con los 4 modos. Test con seed.
3. PR #3 — Nuevo dialog stepper. Borra el dialog viejo en el mismo PR.
4. PR #4 — `payment-methods.tsx` en /pagos + multi-pay-dialog. Borra los chips estáticos en el mismo PR.
5. PR #5 — Copy global "Reportar pago" → "Subir comprobante" + extraordinary invoices end-to-end.

### Definition of done

- [ ] Admin puede generar cuotas con 4 modos (flat / aliquot / type / manual) y la preview muestra cada invoice antes de confirmar.
- [ ] Admin puede generar derrama extraordinaria con período distinto al mensual.
- [ ] /pagos muestra los datos bancarios reales del condo, copiables al tap.
- [ ] Residente puede pagar 3 invoices con 1 comprobante.
- [ ] Cero referencias a "Reportar pago" en el código.
- [ ] Migration aplicada en producción sin downtime.

---

## Épica 2 — Comunicación honesta (módulo visitantes)

**Por qué:** el módulo promete WhatsApp share y vigilante escaneando, pero ninguno existe. Hoy el residente genera un QR que no puede compartir y nadie escanea. O lo arreglamos o lo desactivamos.

### Estado actual

- `condoapp/src/app/(dashboard)/visitantes/page.tsx` línea ~52: paso 02 dice "Envía el QR por WhatsApp a tu visitante" — sin botón.
- Línea ~83-117: lista de pases muestra chip "ACTIVO/USADO/EXPIRADO" pero **no se renderiza el QR a tamaño grande en ningún lado**. El residente no puede compartirlo.
- Paso 03 dice "El vigilante escanea y verifica al instante" — no existe rol vigilante, no existe UI de escaneo, no existe registro de uso.
- `access_passes.qr_code` se genera al crear el pase pero solo es un string. No se renderiza como imagen QR.
- `access_passes.unit_number` es texto libre — sin FK a `units`.
- `used_at` se setea (en seed) pero ninguna server action lo escribe; no hay flujo real de "marcar como usado".

### Qué cambia

**Schema (migration 017_concierge_role.sql):**
```sql
-- Permitir 'concierge' en profiles.role
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'resident', 'concierge'));

-- Tipo de visitante + vehículo
ALTER TABLE access_passes
  ADD COLUMN visitor_kind TEXT NOT NULL DEFAULT 'guest'
    CHECK (visitor_kind IN ('guest', 'family', 'delivery', 'rideshare', 'service', 'moving', 'other')),
  ADD COLUMN vehicle_plate TEXT,
  ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE SET NULL;

-- Backfill unit_id desde unit_number text + drop column vieja
UPDATE access_passes p SET unit_id = (
  SELECT u.id FROM units u
  WHERE u.organization_id = p.organization_id AND u.unit_number = p.unit_number LIMIT 1
);
ALTER TABLE access_passes DROP COLUMN unit_number;

-- Log de acceso
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pass_id UUID NOT NULL REFERENCES access_passes(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  vehicle_plate TEXT,
  notes TEXT
);
```

**UI nueva:**
- `condoapp/src/app/(dashboard)/visitantes/qr-modal.tsx` — modal a tap con QR grande generado client-side (`qrcode` npm) + 2 botones: "Compartir por WhatsApp" (`https://wa.me/?text=...`) y "Copiar enlace".
- `condoapp/src/app/(dashboard)/visitantes/new-pass-dialog.tsx` — agregar selector `visitor_kind` con duraciones default por tipo + campo `vehicle_plate`.
- `condoapp/src/app/(concierge)/scan/page.tsx` (nuevo route group) — UI mínima del concierge: cámara + lista de pases activos del día + tap para marcar uso.
- `condoapp/src/app/(concierge)/layout.tsx` — layout sin sidebar, solo top bar minimal.
- `concierge-actions.ts` — `markPassUsed(passId, plate?, notes?)`.

**Copy:**
- Paso 02 mantiene el texto, pero ahora el botón existe.
- Paso 03 refleja el flujo real: "El vigilante escanea desde su panel y queda registro."

### Qué se borra

- ❌ `access_passes.unit_number` columna texto libre (reemplaza por `unit_id` FK).
- ❌ Cálculo de "expired" en runtime en `visitantes/page.tsx` línea ~28-33 — debe ser un estado real en DB con cron diario, no recálculo en cada render.
- ❌ Si decidimos que vigilante no es viable en esta fase, el paso 03 cambia a "El vigilante verifica el QR en pantalla del residente" y se descarta el route `/concierge`. (**Decisión pendiente**, ver "Decisiones abiertas" abajo.)

### Migración paso a paso

1. PR #1 — Migration 017 + backfill `unit_id` + drop `unit_number`. Sin UI nueva.
2. PR #2 — `qr-modal.tsx` con render QR + WhatsApp share. Borra promesa muerta del paso 02.
3. PR #3 — `visitor_kind` en dialog nuevo + duraciones default.
4. PR #4 — Route `/concierge` + acción `markPassUsed` + access_logs. *(Solo si decisión de vigilante = sí.)*

### Definition of done

- [ ] Residente puede tap a un pase activo, ver QR grande, compartir por WhatsApp.
- [ ] Tipos de visitante seleccionables con default razonable de vigencia.
- [ ] Vehículo con placa registrable (cuando aplica).
- [ ] Si vigilante: scan funcional + access_logs visibles para residente.
- [ ] Cero promesas en copy que el código no entregue.

---

## Épica 3 — Una sola fuente para decisiones

**Por qué:** hoy hay dos modelos para "votar": `polls` (que la UI usa) y `assemblies + votes + vote_responses` (que existe en DB pero no tiene UI). Eso es deuda activa. Cada feature nueva de votación tendría que decidir cuál tabla tocar.

### Estado actual

- `condoapp/supabase/migrations/008_polls_rls.sql` — tablas `polls` + `poll_votes`. Modelo simple.
- `condoapp/supabase/migrations/001_core_schema.sql` líneas 209-243 — tablas `assemblies + votes + vote_responses`. Modelo formal (con quórum).
- `condoapp/src/app/(dashboard)/votaciones/page.tsx` — solo consume `polls`.
- `condoapp/src/app/(dashboard)/votaciones/new-poll-dialog.tsx` y `poll-card.tsx` — solo polls.
- `assemblies` se referencia en seed_demo_phase3 y phase4 (vote_responses) pero no hay UI.

### Qué cambia

**Decisión arquitectónica:** unificamos en **un solo modelo** llamado `decisions`. Una decisión puede ser tipo `quick_poll` (simple) o `formal_assembly` (con quórum y acta).

**Schema (migration 018_decisions.sql):**
```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  kind TEXT NOT NULL CHECK (kind IN ('quick_poll', 'formal_assembly')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed', 'cancelled')),
  weighted_by_aliquot BOOLEAN NOT NULL DEFAULT false,
  quorum_pct NUMERIC(5,2),
  scheduled_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE decision_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  position INT NOT NULL DEFAULT 0
);

CREATE TABLE decision_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES decision_questions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  weight NUMERIC(8,4) DEFAULT 1.0,  -- alícuota si weighted_by_aliquot
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, voter_id)
);

-- Migración de datos: polls → decisions (kind='quick_poll', 1 question)
INSERT INTO decisions (id, organization_id, created_by, kind, title, status, closes_at, created_at)
SELECT id, organization_id, created_by, 'quick_poll', question,
  CASE WHEN is_open THEN 'open' ELSE 'closed' END,
  ends_at, created_at
FROM polls;

INSERT INTO decision_questions (decision_id, question, options, position)
SELECT id, question, options, 0 FROM polls;

INSERT INTO decision_responses (question_id, voter_id, selected_option, created_at)
SELECT
  (SELECT id FROM decision_questions q WHERE q.decision_id = pv.poll_id LIMIT 1),
  pv.voter_id, pv.selected_option, pv.created_at
FROM poll_votes pv;

-- Migración: assemblies → decisions (kind='formal_assembly')
INSERT INTO decisions (id, organization_id, created_by, kind, title, description, status, scheduled_at, quorum_pct, weighted_by_aliquot, created_at)
SELECT a.id, a.organization_id,
  (SELECT id FROM profiles WHERE role IN ('admin','super_admin') AND organization_id = a.organization_id LIMIT 1),
  'formal_assembly', a.title, a.description,
  CASE a.status WHEN 'completed' THEN 'closed' WHEN 'cancelled' THEN 'cancelled' ELSE 'open' END,
  a.scheduled_at, a.quorum_required, false, a.created_at
FROM assemblies a;

-- Migración: votes → decision_questions, vote_responses → decision_responses
INSERT INTO decision_questions (id, decision_id, question, options, position)
SELECT id, assembly_id, question, options, 0 FROM votes;

INSERT INTO decision_responses (question_id, voter_id, selected_option, created_at)
SELECT vote_id, voter_id, selected_option, created_at FROM vote_responses;
```

**UI:**
- Renombrar `/votaciones` → `/decisiones` (route + sidebar).
- `decisiones/page.tsx` — tabs "Abiertas" / "Cerradas". Cada decisión es card con kind badge + tracker quórum si aplica.
- `decisiones/new-decision-dialog.tsx` — wizard: kind → preguntas → opciones → ponderación → fecha cierre.
- `decisiones/[id]/page.tsx` — detalle: votar pregunta a pregunta, ver progreso quórum, exportar acta PDF si formal.

### Qué se borra

- ❌ Tabla `polls` (al final de la migración, después de copiar data).
- ❌ Tabla `poll_votes`.
- ❌ Tabla `votes` (la de assemblies).
- ❌ Tabla `vote_responses`.
- ❌ Tabla `assemblies`.
- ❌ Carpeta entera `src/app/(dashboard)/votaciones/` — reemplazada por `decisiones/`.
- ❌ Sidebar item "Votaciones" → "Decisiones".
- ❌ En seed_demo_phase3 y phase4: ajustar para insertar en `decisions` (o aceptar que data vieja se migra y nueva data va al schema nuevo).

### Migración paso a paso

1. PR #1 — Migration 018: tablas nuevas + copy de data. **No** drop todavía.
2. PR #2 — Nueva ruta `/decisiones` lee de `decisions`. Vieja `/votaciones` queda redireccionando.
3. PR #3 — Drop tablas viejas + carpeta `/votaciones` + sidebar update + seed actualizado.

### Definition of done

- [ ] Existe una sola tabla raíz para decisiones de gobierno.
- [ ] Quick poll y asamblea formal funcionan ambos en el mismo flujo unificado.
- [ ] Voto ponderado por alícuota disponible (no obligatorio).
- [ ] Quórum tracking visible en asamblea formal.
- [ ] Cero referencias en el código a `polls`, `votes`, `vote_responses`, `assemblies`.

---

## Épica 4 — Estado del residente visible

**Por qué:** el dashboard saluda con tu nombre pero no te dice ni dónde vives. Para alguien que entra una vez al mes, esto es desorientación. Es la épica más barata y la que más mejora la sensación.

### Estado actual

- `condoapp/src/app/(dashboard)/dashboard/page.tsx` — saludo + saldo + 4 quick actions + 3 comunicados + 3 reportes.
- No muestra: apto, condominio, rol (owner/tenant), próxima reserva propia.
- `getCurrentProfile()` ya tiene la data; faltan 2 queries pequeñas.
- `getMaintenanceForUser` solo retorna reportes propios → no visualiza áreas comunes.
- Comunicados urgentes no se diferencian visualmente de normales en el dashboard.
- Si hay 1 cuota pendiente, "Pagar ahora" lleva a /pagos pero el residente debe hacer click otra vez.

### Qué cambia

**Schema:** ninguno. Esta épica es 100% UI.

**Server queries (extender `lib/queries.ts`):**
- `getDashboardContext(profileId)` — devuelve `{ unit, org, role, upcomingReservation, urgentAnnouncements, hasUrgentDecision }`. Una sola función para todo el dashboard.

**UI:**
- `dashboard/page.tsx`: nuevo header con chip `Apto X · Bloque Y · Condominio Z · ROL OWNER/TENANT`.
- Banner urgent si `urgentAnnouncements.length > 0` (priority='urgent', menos de 7 días).
- Card "Tu próxima reserva" si aplica.
- Card "Decisión pendiente — vota antes del [fecha]" si hay decision abierta y residente no votó.
- Si `pendingInvoices.length === 1` → botón "Pagar ahora" abre el dialog de pago directo (no navega).
- Quick action "Reportar" pregunta "¿en tu unidad o área común?" como primer paso (cambia `unit_id`).

**Móvil:**
- Bottom-bar persistente con botón único "PAGAR" cuando `pendingTotal > 0`. Visible siempre.

### Qué se borra

- ❌ El header actual del dashboard que solo muestra el primer nombre. Se reemplaza por header con contexto completo.
- ❌ La quick action "Reportar" actual que va directo a /mantenimiento sin contexto. Reemplazada por dialog inline con paso 1 = ubicación.
- ❌ La sección "Comunicados" del dashboard que muestra los 3 últimos sin importar prioridad. Reemplazada por banner urgent + card resumen.

### Migración paso a paso

1. PR #1 — `getDashboardContext` + nuevo header + chip de unidad/rol.
2. PR #2 — Banner urgent + card próxima reserva + card decisión pendiente.
3. PR #3 — "Pagar ahora" inteligente (1 click si hay 1 invoice) + bottom-bar móvil.
4. PR #4 — "Reportar" inline con selector ubicación.

### Definition of done

- [ ] Residente al abrir dashboard ve en 1 vista: dónde vive, qué debe, qué tiene pendiente, qué reservó.
- [ ] Urgente nunca queda enterrado por comunicados normales recientes.
- [ ] Si hay 1 invoice pendiente, pagarla son 2 taps en lugar de 4.
- [ ] Móvil tiene bottom-bar funcional con un solo CTA.

---

## Épica 5 — Ciclo completo de gasto

**Por qué:** "Finanzas" hoy es una lista de gastos sueltos. Sin presupuesto no hay control. Sin categorías normalizadas no hay reportes. Es el primer paso para ser un módulo contable real, sin pretender IFRS.

### Estado actual

- `condoapp/supabase/migrations/001_core_schema.sql` `expense_records.category` — texto libre. En seed hay valores: vigilancia, mantenimiento, aseo, servicios, piscina, jardineria, nomina, seguros, impuestos, repuestos, oficina, eventos. Strings inconsistentes potencialmente.
- `condoapp/src/app/(dashboard)/finanzas/page.tsx` — KPIs + gastos por categoría + detalle. Sin presupuesto. Sin proveedor. Sin recurrentes.
- `condoapp/src/app/(dashboard)/finanzas/new-expense-dialog.tsx` — categoría como string libre (probablemente, no leído en detalle).
- No hay tabla `vendors`, `budget`, `recurring_expenses`.

### Qué cambia

**Schema (migration 019_finance_core.sql):**
```sql
-- Categorías como enum válida
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,                              -- ej: 'vigilancia'
  label TEXT NOT NULL,                             -- ej: 'Vigilancia'
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,        -- true para las default; admin puede crear extras
  position INT NOT NULL DEFAULT 0,
  UNIQUE(organization_id, code)
);

-- Seed por defecto al crear org: vigilancia, mantenimiento, aseo, servicios,
-- jardineria, nomina, seguros, impuestos, repuestos, oficina, eventos, otros.

ALTER TABLE expense_records
  ADD COLUMN category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  ADD COLUMN vendor_id UUID,                       -- FK más abajo
  ADD COLUMN voided_at TIMESTAMPTZ,
  ADD COLUMN voided_reason TEXT;

-- Backfill: matchear category text a category_id
UPDATE expense_records er SET category_id = (
  SELECT ec.id FROM expense_categories ec
  WHERE ec.organization_id = er.organization_id
    AND ec.code = lower(er.category) LIMIT 1
);
-- Drop el text libre cuando todos backfilleados
ALTER TABLE expense_records DROP COLUMN category;

-- Proveedores
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rif TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE expense_records
  ADD CONSTRAINT expense_records_vendor_fkey FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;

-- Presupuesto anual
CREATE TABLE org_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  approved_at TIMESTAMPTZ,
  approved_by_decision_id UUID REFERENCES decisions(id),  -- ver E3
  UNIQUE(organization_id, year)
);

CREATE TABLE org_budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID NOT NULL REFERENCES org_budgets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  monthly_amount NUMERIC(12,2) NOT NULL,
  notes TEXT
);
```

**Server actions (`finanzas/actions.ts` extender):**
- `createExpense(formData)` — ahora requiere `category_id`, opcional `vendor_id`.
- `voidExpense(id, reason)` — soft delete con razón.
- `createOrUpdateBudget(year, items)` — admin guarda borrador.
- `approveBudget(year, decisionId?)` — vincula con decisión.

**UI:**
- `finanzas/page.tsx` — agregar arriba: card "Presupuesto 2026" con barra ejecutado/aprobado por categoría.
- `finanzas/new-expense-dialog.tsx` — selector category enum + autocomplete vendor (con quick-create).
- `admin/settings/finance-config.tsx` — gestión de categorías custom + vendors.
- `admin/budget/page.tsx` (nuevo) — editor anual: una fila por categoría × 12 meses + total.

### Qué se borra

- ❌ Columna `expense_records.category` text libre.
- ❌ Cualquier seed que insertaba categorías como strings ("vigilancia", "aseo") sin pasar por `expense_categories`. Adaptar seed_demo_phase4.
- ❌ Seed de fee_breakdown que usa amounts hardcoded — debe alinearse con la fuente real (E1 ya define quién manda).
- ❌ El bloque `categoryAccent` hardcoded en `finanzas/page.tsx` líneas ~45-50. Color/icono viene de `expense_categories`.

### Migración paso a paso

1. PR #1 — Migration 019 (tablas + seed default categorías + backfill `category_id`).
2. PR #2 — Nuevo dialog de gasto con category enum + vendors. Borra el text libre en mismo PR.
3. PR #3 — Settings → gestión de categorías custom + vendors.
4. PR #4 — `org_budgets` editor + render en /finanzas con presupuesto vs ejecutado.
5. PR #5 — `voidExpense` + soft delete UI.

### Definition of done

- [ ] Cero categorías como string libre en DB.
- [ ] Cada gasto tiene categoría normalizada y opcionalmente proveedor.
- [ ] Admin puede definir presupuesto anual por categoría y aprobarlo.
- [ ] /finanzas muestra ejecutado vs presupuesto del mes y acumulado año.
- [ ] Anular gasto requiere razón y queda en histórico (no se borra).

---

## Decisiones abiertas (pendientes de tu input)

Antes de arrancar la primera épica, necesito que decidas:

1. **¿Vigilante como rol propio en E2 o lo posponemos?**
   - Sí → E2 incluye route `/concierge` + access_logs (~3 semanas).
   - No → E2 solo arregla QR share + tipos visitante (~1 semana). El paso 03 del flow se reescribe a "el vigilante verifica QR en pantalla del residente". (Mi recomendación si quieres salir antes.)

2. **¿El BCV automático entra en E1 o más adelante?**
   - Mi recomendación: **fuera del núcleo**. Cron + dependencia externa = riesgo. Admin sigue actualizando manual.

3. **¿WhatsApp Business API entra en alguna épica del núcleo?**
   - Mi recomendación: **no**. Es módulo entero (cuenta, números verificados, costos). Va a fase 2 cuando los 5 estén firmes.

4. **¿Renombramos `/votaciones` a `/decisiones` o mantenemos el nombre?**
   - Argumento a favor del cambio: refleja mejor lo que es (incluye asambleas formales).
   - Argumento contra: usuarios ya tienen el término "votar" mental.
   - Mi recomendación: **renombrar**, una sola vez, antes de que crezca el uso.

5. **Ordenamiento real:**
   - El listado E1 → E5 es lógico de dependencias (E5 depende de categorías limpias, E3 desbloquea voto en presupuesto E5).
   - Pero si quieres priorizar **adopción rápida**, E4 (estado del residente) podría ir primero porque es barato y mejora UX percibida sin tocar core.
   - Mi recomendación: **E1 → E4 → E2 → E3 → E5**. E1 es el bloqueante de negocio, E4 es la victoria rápida, E2 limpia copy engañoso, E3 deuda técnica, E5 contabilidad real.

---

## Cómo seguimos

Cuando me confirmes las 5 decisiones de arriba, propongo:

1. Yo escribo memoria del plan y referencia a este archivo (ya hecho parcialmente).
2. Tú apruebas (o ajustas) el orden definitivo.
3. Entramos a E1 con `EnterPlanMode`. Diseñamos la implementación en detalle. Una vez aprobado el plan, ejecutamos.
4. Después de E1 cerrado y deployado, repetimos para la siguiente.

No vamos a tocar código fuera del orden acordado. No vamos a añadir features de la auditoría no incluidas en estas 5 épicas hasta que las 5 estén shipping.
