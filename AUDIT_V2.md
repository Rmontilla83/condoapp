# AUDIT V2 — Plan de hardening del flujo de acceso

**Fecha:** 2026-04-21
**Autor:** Rafael + Claude
**Estado:** Plan aprobado, implementación en curso
**Supersede:** `project_magic_link_audit.md` (v1, 2026-04-20)

---

## 1. Contexto y motivación

### 1.1 Origen del audit

El 2026-04-20 Rafael invitó a `jodanymonasterio@gmail.com` como admin de Residencias Los Robles. El dialog "Invitar admin" dijo "invitación enviada", pero Jodany nunca recibió correo. Rafael la promovió manualmente vía SQL.

Pedido del usuario: auditoría exhaustiva para cerrar todos los errores del flujo. La primera pasada identificó **11 bugs** en el magic link / onboarding.

### 1.2 Problema adicional detectado en V2

El flujo actual deja que **el residente elija su propia unidad** desde un selector del condominio. Esto es inaceptable:

- Riesgo de error humano (elige el apto equivocado y ve datos ajenos)
- Riesgo de mala fe (se apropia del apto de otro)
- El admin no tiene control de quién ocupa qué

Comparación con la industria (Buildium, AppFolio, ComunidadFeliz, TownSq): **ninguno** deja al residente elegir su unidad. El admin siempre asigna.

### 1.3 Decisión de producto

Rediseñar el flujo de onboarding con:

1. **Modelo híbrido 1+2**: admin invita por email **o** genera código único por unidad
2. **Modelo C (3 modos de ocupación)** por unidad: habitada por propietario, arrendada con propietario activo, arrendada con propietario ausente
3. **Permisos separados propietario vs inquilino** con 2 niveles de configuración (organización + unidad)

---

## 2. Los 11 bugs originales (v1)

### Críticos
- **B1.** `inviteAdmin` en `src/app/(super-admin)/super-admin/actions.ts:39-84` NO envía email. Solo inserta en `admin_invitations`. El dialog miente.
- **B2.** `src/components/onboarding.tsx:27-51` — promoción a admin depende de `useEffect` cliente-side, falla silenciosamente por `.single()` sin try/catch, RLS frágil, UPDATE sin verificar error.
- **B3.** `/auth/confirm/page.tsx:20-28, 42-44` — si ya hay sesión, auto-redirige a dashboard SIN procesar el nuevo token. Usuario nunca entra con nueva cuenta.

### Altos
- **B4.** `/auth/confirm` sin guard `useRef` — Strict Mode / doble click dispara `verifyOtp` dos veces, segundo falla "token usado".
- **B5.** Branch de hash `access_token` en `/auth/confirm` es código muerto (el template usa query param).
- **B6.** `/auth/callback/route.ts` es server-side con verifyOtp automático. Si cualquier link lo apunta, el prefetch del email consume el token — vuelve el bug original.
- **B7.** RLS de `admin_invitations` usa `email = (SELECT email FROM profiles WHERE id = auth.uid())` — frágil si profile no existe o hay case mismatch. Debe usar `lower(auth.jwt() ->> 'email')`.

### Medios
- **B8.** No hay re-envío de invitación desde super admin (link expira en 1h).
- **B9.** `inviteAdmin` degrada super_admins existentes a admin si son "invitados" (actions.ts:69-80).
- **B10.** Template de email vive en Supabase dashboard, no versionado. Si se pierde vuelve el bug de prefetch.
- **B11.** Sin observabilidad — fallas silentes nunca llegan al super admin.

---

## 3. Principios de diseño

1. **El admin asigna, el residente confirma**. El residente nunca elige su unidad.
2. **Jerarquía legal respetada**. El propietario manda sobre su unidad, el inquilino opera el día a día.
3. **Funciona con propietarios ausentes** (caso frecuente Latam / diáspora venezolana).
4. **Permisos en 2 niveles**: organización (policy del condo) + unidad (criterio del propietario).
5. **Observabilidad desde el día 1**. Ninguna falla de auth puede ser silenciosa.
6. **Configuración versionada**. El template de email vive en el repo, no en el dashboard.

---

## 4. Modelo de datos final

### 4.1 Cambios en `organizations` (policies del condo)

```sql
ALTER TABLE organizations
  ADD COLUMN tenant_can_vote             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN tenant_can_see_delinquents  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN tenant_can_reserve          BOOLEAN NOT NULL DEFAULT true;
```

Configurables por admin del condominio.

### 4.2 Cambios en `units` (modo de ocupación)

```sql
ALTER TABLE units
  ADD COLUMN ownership_mode TEXT NOT NULL DEFAULT 'owner_occupied'
    CHECK (ownership_mode IN ('owner_occupied', 'tenant_with_active_owner', 'tenant_only'));
```

- `owner_occupied`: propietario vive allí, 1 usuario
- `tenant_with_active_owner`: arrendada, propietario también usa la app
- `tenant_only`: arrendada, propietario ausente, admin gestiona al inquilino

### 4.3 Nueva tabla `unit_members` (reemplaza `unit_residents`)

```sql
CREATE TABLE unit_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'tenant')),
  active BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{}',  -- solo role='tenant': {can_see_fee, can_pay_fee}
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, profile_id, role)
);
```

Permite: 1 propietario + N inquilinos; histórico de ocupación; un profile puede ser propietario en A-301 e inquilino en B-205.

### 4.4 Nueva tabla `unit_access_codes` (híbrido 1+2)

```sql
CREATE TABLE unit_access_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  assigned_role TEXT NOT NULL CHECK (assigned_role IN ('owner', 'tenant')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Un código por asignación. Se canjea una vez, crea el `unit_member` correspondiente.

### 4.5 Nueva tabla `auth_events` (observabilidad)

```sql
CREATE TABLE auth_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_email TEXT,
  event TEXT NOT NULL,  -- invite_sent, invite_accepted, magic_link_verified, code_redeemed, *_failed
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.6 Migración de datos existentes

`unit_residents` tiene datos en producción (ej. salazaracvsr@gmail.com en Los Robles). Plan:

```sql
INSERT INTO unit_members (unit_id, profile_id, role, active, joined_at)
SELECT
  unit_id,
  profile_id,
  CASE WHEN is_owner THEN 'owner' ELSE 'tenant' END,
  moved_out_at IS NULL,
  moved_in_at::timestamptz
FROM unit_residents;
```

Mantener `unit_residents` como vista legacy durante migración. Borrar en migración 014 cuando todo el código apunte a `unit_members`.

---

## 5. Tabla de permisos (referencia)

| Feature | Propietario | Inquilino |
|---|:---:|:---:|
| Ver cuota de su unidad | ✅ | ⚙️ propietario |
| Pagar cuota | ✅ | ⚙️ propietario |
| Ver morosidad de su unidad | ✅ | ✅ **fijo** |
| Ver lista de morosos del condo | ✅ | ⚙️ admin org |
| Ver finanzas/gastos del condo (transparencia) | ✅ | ✅ fijo |
| Registrar visitantes / QR | ✅ | ✅ fijo |
| Reportar mantenimiento | ✅ | ✅ fijo |
| Recibir comunicados | ✅ | ✅ fijo |
| Reservar áreas comunes | ✅ | ⚙️ admin org |
| Votar en asambleas | ✅ | ⚙️ admin org |
| Invitar/remover inquilino | ✅ | ❌ |
| Editar datos de la unidad | ✅ | ❌ |

**Leyenda:**
- ✅ fijo: siempre permitido
- ❌: nunca permitido
- ⚙️ admin org: configurable vía `organizations.tenant_can_*`
- ⚙️ propietario: configurable vía `unit_members.permissions` para el tenant

---

## 6. Flujos

### 6.1 Admin configura una unidad (nuevo)

```
Admin → /admin/units
  → Elegir unidad A-301
  → Seleccionar modo de ocupación:
      [x] Habitada por propietario
      [ ] Arrendada con propietario activo
      [ ] Arrendada con propietario ausente
  → Agregar propietario:
      - Opción A: ingresar email → sistema manda magic link
      - Opción B: generar código de acceso → admin se lo entrega al residente
  → Si modo "arrendada con propietario activo":
      - Admin puede dejar que el propietario invite al inquilino después
  → Si modo "arrendada con propietario ausente":
      - Admin también invita al inquilino (email o código)
```

### 6.2 Residente se une (propietario o inquilino)

```
Residente recibe magic link O código físico
  → Magic link:
      /auth/confirm?token_hash=...&type=magiclink
      → Usuario toca botón → verifyOtp → sistema detecta que su email está
        precargado en una unidad → asigna automáticamente → dashboard
  → Código físico:
      /join → ingresa código → sistema valida → crea unit_member → dashboard
```

**Sin selector de unidad. Nunca.**

### 6.3 Propietario gestiona a su inquilino

```
Propietario → Mi unidad → Gestionar inquilino
  → [Invitar inquilino] (email o generar código)
  → [Ver permisos]: toggle can_see_fee, can_pay_fee
  → [Remover inquilino] → marca unit_member.active = false, removed_at = now()
```

### 6.4 Super admin configura el condo

```
Super admin / Admin → /admin/settings → Políticas del condominio
  → ¿Los inquilinos pueden votar?          [ON/OFF]
  → ¿Los inquilinos ven lista de morosos?  [ON/OFF]
  → ¿Los inquilinos pueden reservar áreas? [ON/OFF]
```

---

## 7. Plan de implementación — 5 capas

### Capa 0 — Modelo de datos y flujo de acceso ⬅ EN CURSO

| # | Tarea | Archivo |
|---|---|---|
| 0.1 | Migración SQL de hardening | `supabase/migrations/013_ownership_model.sql` |
| 0.2 | Aplicar migración | `npx supabase db query --linked` |
| 0.3 | Regenerar tipos TypeScript | `src/types/supabase.ts` |
| 0.4 | Eliminar selector de unidad del onboarding | `src/components/onboarding.tsx` |
| 0.5 | Admin UI: unidad → modo + invitar o código | `src/app/(admin)/admin/units/*` |
| 0.6 | Propietario UI: "Mi inquilino" con permisos | `src/app/(dashboard)/mi-unidad/*` |
| 0.7 | Super admin UI: policies del condo | `src/app/(admin)/admin/settings/*` |

### Capa 1 — Backend atómico (DB)

| # | Tarea | Archivo |
|---|---|---|
| 1.1 | Función `redeem_access_code(code)` SECURITY DEFINER | migración 013 |
| 1.2 | Función `accept_owner_invite()` / `accept_tenant_invite()` | migración 013 |
| 1.3 | RLS actualizadas en unit_members (filtro por role + active) | migración 013 |
| 1.4 | Trigger `handle_new_user` extendido: chequea pending invites + access codes + admin_invitations | migración 013 |
| 1.5 | RLS de admin_invitations usa `lower(auth.jwt() ->> 'email')` (B7) | migración 013 |

### Capa 2 — Server actions

| # | Tarea | Archivo |
|---|---|---|
| 2.1 | Arreglar `inviteAdmin` — sí mandar email (B1) | `src/app/(super-admin)/super-admin/actions.ts` |
| 2.2 | `inviteOwner(unitId, email)` y `inviteTenant(unitId, email)` | `src/app/(admin)/admin/units/actions.ts` |
| 2.3 | `generateAccessCode(unitId, role)` + `revokeAccessCode(codeId)` | idem |
| 2.4 | `removeTenant(unitMemberId)` | idem |
| 2.5 | `setTenantPermissions(unitMemberId, permissions)` | `src/app/(dashboard)/mi-unidad/actions.ts` |
| 2.6 | `setOrgPolicies(policies)` | `src/app/(admin)/admin/settings/actions.ts` |
| 2.7 | `resendInvitation(invitationId)` | `src/app/(super-admin)/super-admin/actions.ts` |
| 2.8 | Cliente admin con SERVICE_ROLE_KEY | `src/lib/supabase/admin.ts` (nuevo) |

### Capa 3 — UI simplificada

| # | Tarea | Archivo |
|---|---|---|
| 3.1 | `/auth/confirm`: eliminar branch hash (B5), eliminar auto-redirect (B3), guard useRef (B4), mejor error copy | `src/app/(auth)/auth/confirm/page.tsx` |
| 3.2 | Eliminar `/auth/callback` (B6) — redirect a `/auth/confirm` si algún link lo apunta | `src/app/(auth)/auth/callback/route.ts` |
| 3.3 | `Onboarding.tsx`: quitar selector unidad, delegar a server action | `src/components/onboarding.tsx` |
| 3.4 | Nuevo `/join` para canjear código | `src/app/(auth)/join/page.tsx` (nuevo) |
| 3.5 | Dashboard diferenciado propietario vs inquilino (permisos) | múltiples |

### Capa 4 — Observabilidad y resiliencia

| # | Tarea | Archivo |
|---|---|---|
| 4.1 | Tabla `auth_events` + función `log_auth_event()` | migración 013 |
| 4.2 | `/super-admin/invitations` con estado + reenviar | `src/app/(super-admin)/super-admin/invitations/*` |
| 4.3 | `/admin/units` muestra estado de ocupación claro | idem 0.5 |
| 4.4 | Healthcheck template email + SiteURL + Redirect URLs | `src/app/api/healthcheck/auth/route.ts` |
| 4.5 | Template de email versionado en `supabase/templates/magic-link.html` | nuevo archivo |

---

## 8. Orden de ejecución

1. ✅ Escribir `AUDIT_V2.md` (este documento)
2. ⬅ Escribir `013_ownership_model.sql` (Capa 0 + 1 combinadas en SQL)
3. Aplicar migración con `npx supabase db query --linked`
4. Regenerar tipos TS
5. Arreglar B1 (server action `inviteAdmin`) + crear `src/lib/supabase/admin.ts`
6. Crear server actions nuevas (2.2–2.8)
7. Arreglar Capa 3 UI (onboarding, /auth/confirm, eliminar /auth/callback)
8. Construir UI admin de unidades con modo de ocupación
9. Construir UI propietario → gestionar inquilino
10. Construir UI super admin → policies del condo
11. Capa 4 observabilidad

Cada paso se despliega a Vercel y se prueba con usuarios reales (Iker, Jodany, salazaracvsr) antes del siguiente.

---

## 9. Checklist de configuración manual requerida

- [ ] `SUPABASE_SERVICE_ROLE_KEY` en env vars de Vercel
- [ ] Template de email Supabase usa `{{ .TokenHash }}` (NO `{{ .ConfirmationURL }}`)
- [ ] Redirect URLs de Supabase incluyen `/auth/confirm` y `/join`
- [ ] Desactivar `/auth/callback` en Redirect URLs (opcional, o mantener con redirect)

---

## 10. Decisiones pendientes (no bloquean arrancar)

1. **Múltiples inquilinos:** ¿N tenants activos en la misma unidad (estudiantes compartiendo), o solo 1 principal?
2. **Copropietarios:** ¿A-301 puede tener 2 owners (matrimonio)?
3. **Notificaciones cruzadas:** ¿el propietario recibe push cuando su inquilino registra un visitante?

El modelo de datos ya soporta las 3; solo falta decidir la UI.

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Migrar `unit_residents` → `unit_members` rompe queries existentes | Mantener vista legacy `unit_residents` durante transición; migración 014 la borra |
| Residentes ya registrados pierden acceso | Backfill en migración 013: todo `unit_residents.is_owner=true` → role='owner'; resto → 'tenant' |
| Admin olvida configurar modo de ocupación | Default `owner_occupied` + UI obliga a elegir al invitar |
| Código de acceso se pierde/filtra | Un solo uso + `expires_at` default 7 días + botón revocar |
| Supabase template se pierde | Versionado en `supabase/templates/magic-link.html` + healthcheck |

---

**Fin AUDIT_V2.md**
