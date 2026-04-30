# Auditoría funcional Atryum — abril 2026

**Fecha:** 2026-04-28
**Alcance:** revisión punta a punta del producto en `main` (rebrand V3 Marine + Audit V2 cerrado)
**Premisas que guían el análisis:**
1. **Para el residente** la app debe ser absurdamente simple — gente mayor, gente apurada, gente que solo entra a pagar y a reservar la parrillera. Cero menús profundos. Cero jerga.
2. **Para la administración** la app debe ahorrarle horas a la semana. Carga rápida, contabilidad real (no "lista de gastos"), reportes auto-generados.
3. **Diferenciador** está en transparencia financiera + módulo contable + UX de residente. Esos tres son el pozo donde la competencia (ComunidadFeliz, TownSq, PayHOA) falla.
4. **Lógica de datos** debe respetar quién ingresa qué: el admin captura gastos y cobra, el propietario gestiona inquilino y delega permisos, el inquilino opera dentro de los permisos, el vigilante (rol que aún no existe) escanea QR.

---

## TL;DR — los 10 cambios que mueven la aguja

| # | Cambio | Impacto | Esfuerzo |
|---|---|---|---|
| 1 | **Cuotas por alícuota** (no monto único). Reemplazar el dialog "Generar cuotas" por "Generar mes" con 3 opciones: igual, por alícuota, por tipo. | Crítico — sin esto no es contabilidad real. | M |
| 2 | **Datos bancarios del condo** en Settings + render automático en /pagos cuando hay deuda. Hoy los chips "Stripe / Débito Inmediato" son mentira. | Crítico — fricción #1 en el flujo de pago. | S |
| 3 | **Cuotas extraordinarias / derramas** como tipo de invoice separado. Hoy un admin tiene que improvisar. | Alto — caso de uso muy frecuente. | M |
| 4 | **Vista "Mi unidad" para el residente** (no solo para owner). Card visible en /dashboard con apto + saldo + próxima reserva + estado de reportes. | Alto — fija contexto, reduce navegación. | S |
| 5 | **Estado de cuenta exportable PDF** (residente y admin). Validar adopción real: nadie va a "ver el historial" online si necesita papel para algo legal. | Alto — diferenciador vs competencia. | M |
| 6 | **WhatsApp share del QR** real (link `wa.me/?text=`). Hoy se promete pero no se hace. | Alto — el copy ya lo vende. | XS |
| 7 | **Categorías de gasto como enum + presupuesto** anual aprobado en asamblea con vista mes-a-mes ejecutado vs. planeado. | Alto — núcleo del valor para administración. | M |
| 8 | **Lectura obligatoria** de comunicados urgentes (acuse de recibo, banner persistente). | Medio — diferenciador. | S |
| 9 | **Disponibilidad real en /reservas** (calendario por slots con choque), no solo lista. + restricción por morosidad cuando aplique. | Medio — feature que aman residentes según research. | M |
| 10 | **Rol vigilante** + escaneo QR + log de acceso. Hoy el visitante tiene QR pero nadie lo escanea. | Medio — diferenciador real, hoy el flujo está roto. | M |

---

## Hallazgos por flujo

### A. Flujo del residente (owner / tenant)

#### A1. `/dashboard` — Inicio

**Bien hecho**
- Saludo personalizado, jerarquía de saldo pendiente, count-up agradable
- 4 acciones rápidas claras (Pagar, Reportar, QR, Reservar)

**Problemas**
1. **Falta contexto de quién soy y dónde vivo.** No se ve "Apto 3-A · Costa de Plata" en ninguna parte del dashboard. Para alguien que entra una vez al mes, esto es desorientación.
2. **Comunicados sin diferenciar urgentes.** Solo se ven los 3 más recientes; un urgente de hace 2 semanas se pierde si hubo 4 normales después. Debería pinearse mientras esté activo.
3. **Sin notificación de votación abierta.** Hoy votar requiere que el usuario navegue a /votaciones; debería aparecer una card en el dashboard cuando hay encuesta vigente que aún no votó.
4. **Sin recordatorio de próxima reserva propia** (sí muestra reservas de OTROS en /reservas pero no las propias en el dashboard).
5. **Acción "Pagar" lleva a /pagos pero no inicia el pago.** Si tienes una sola cuota pendiente, debería abrir el dialog directamente.

**Recomendaciones**
- Header del dashboard: chip pequeño "Apto X · Condominio Y · ROL OWNER/TENANT"
- Si hay urgent activo (< 7 días), banner full-width arriba
- Card "Tu votación pendiente" cuando aplica (con CTA "Votar")
- Card "Próxima reserva: parrilla, sábado 5pm" si aplica
- Si hay 1 cuota pendiente → "Pagar ahora" abre el dialog directo (ahorra 1 click)

---

#### A2. `/pagos` — Estado de cuenta

**Bien hecho**
- KPIs claros (saldo, último pago, próximo vencimiento)
- Multi-currency USD/Bs visible
- Desglose de cuota mensual transparente

**Problemas críticos**
1. 🚨 **Los "métodos disponibles" son chips estáticos sin acción.** Dice "Débito Inmediato (Bs)" "Stripe (USD)" "Transferencia + comprobante" — los dos primeros NO existen, el tercero es lo único real. Esto es UX engañosa.
2. 🚨 **No hay datos bancarios del condo en ningún lado.** El residente debe preguntar al admin. Cero diferenciación.
3. **No se puede pagar varias cuotas a la vez.** Si tengo abril + derrama febrero pendientes, son 2 dialogs separados, 2 comprobantes.
4. **Tasa BCV no auto-actualizada.** El admin la ingresa manual — propenso a olvido. La fuente real (BCV.org.ve) tiene un endpoint.
5. **Botón "Reportar pago" suena a denuncia**, no a "registrar pago". Casi todos los sistemas latam dicen "Subir comprobante" o "Registrar pago".
6. **Al subir comprobante no hay preview** de la imagen antes de enviar.
7. **No se ve el monto en Bs equivalente al subir** — el residente paga en Bs pero no sabe cuánto Bs son los $85 de la cuota a tasa de hoy.

**Recomendaciones**
- Settings nueva sección: **Cuentas para pagos** (banco, número, RIF, beneficiario, Pago Móvil número, Zelle email). Render automático en /pagos cuando hay deuda.
- "Métodos disponibles" → cada uno copia al portapapeles los datos al tocarlo. Banco Mercantil / 0105-... / J-... / Pago Móvil 0414-... → tap = copiar.
- Multi-pago: checkbox por invoice + footer total + 1 dialog que abarca todas.
- Cron diario que llame a fuente BCV oficial y actualice exchange_rates con `source='bcv_auto'`. Admin sigue pudiendo hacer override manual.
- Renombrar "Reportar pago" → "Subir comprobante"
- Preview de imagen + mostrar **monto equivalente Bs hoy** antes del submit
- Botón "Recordar pago a admin" si lleva > 3 días pendiente sin respuesta

---

#### A3. `/mantenimiento` — Reportes

**Bien hecho**
- Tracker visual de pasos (new → review → progress → resolved)
- Categorías con prioridad

**Problemas**
1. **Solo veo MIS reportes.** No veo "el ascensor está dañado y otro vecino ya reportó" → reporto duplicado. Debería haber tab "Mi unidad" + "Comunes del condo".
2. **Categorías son strings libres** ("plomeria", "ascensor", "electricidad"). Sin enum normalizado, no se puede agrupar para reporting al admin.
3. **No hay chat / comentarios en cada reporte.** Si admin necesita más info ("¿qué piso?"), no puede preguntar dentro del ticket.
4. **No hay notificación al residente cuando cambia status.** El historial se construyó (`maintenance_status_log`) pero nadie lo nota.
5. **No se diferencia "área propia" vs "área común".** Hoy `unit_id` puede ser null pero la UI no lo aclara — debería preguntar "¿es en tu unidad o en una zona común?" como primer paso.
6. **Sin "+1" / "me pasa lo mismo".** Crowd-source priorización: si 5 vecinos reportan iluminación pasillo, sube prioridad automáticamente.

**Recomendaciones**
- 2 tabs: **Mis reportes** | **Comunes del condo**
- Categorías como enum: plomería, electricidad, ascensor, áreas comunes, estructura, plagas, climatización, seguridad, jardinería, otro
- Comentarios timeline en cada ticket (admin + residente). Notificación email/in-app al cambio.
- Selector inicial obvio: "¿Dónde es?" → Mi unidad (auto-asigna unit_id) | Área común (unit_id=null)
- Botón "+1 me pasa lo mismo" para reportes en áreas comunes (visible en tab "Comunes")

---

#### A4. `/visitantes` — QR

**Bien hecho**
- Sección "Cómo funciona" muy clara con 3 pasos numerados

**Problemas críticos**
1. 🚨 **No se ve el QR.** La lista muestra chip "ACTIVO" pero ¿dónde está la imagen del QR? El residente no puede compartirlo.
2. 🚨 **Promete WhatsApp pero no implementa nada.** El paso 02 dice "Envía el QR por WhatsApp a tu visitante" pero no hay botón.
3. **Falta tipo de visitante** (familia / delivery / Uber / proveedor / mudanza). Tiempos de validez por defecto deberían cambiar: delivery 1h, familia días, mudanza horario laboral.
4. **No hay vehículo** (placa, color, modelo). Es información que vigilante necesita.
5. **Vigilante no tiene UI** para escanear. Todo el flujo termina en el aire.
6. **No hay log de acceso** (cuándo entró, vigilante que aprobó). El campo `used_at` se setea pero nadie lo lee.

**Recomendaciones**
- Tap a un pase activo → abre modal con QR a tamaño grande + botón "Compartir por WhatsApp" (`https://wa.me/?text=Tu%20QR%20de%20acceso...%20${qrUrl}`) + "Copiar link"
- Selector de tipo en el dialog de creación: Delivery (default 1h) | Familia (default 24h) | Proveedor (default 8h) | Mudanza (default rango fechas) | Otro
- Campos opcionales: placa, modelo, color de vehículo
- **Nuevo rol `concierge`/`vigilante`** con UI mínima: solo ve scan QR + lista de pases activos del día. Al escanear: marca `used_at`, registra en `access_logs` (tabla nueva).
- Log de acceso visible para residente: "Tu visitante Juan entró a las 18:24"

---

#### A5. `/reservas` — Áreas comunes

**Bien hecho**
- Cards visuales por área
- Distinción "mis reservas" vs "otras reservas"

**Problemas**
1. **No hay vista de disponibilidad.** Para reservar la parrilla del sábado, el residente tiene que hacer click, ingresar hora, y descubrir si chocó con otra reserva. Debería ver el calendario primero.
2. **Reglas del área no son visibles** (capacidad, fianza, horario).
3. **No hay foto del área.** Iconos genéricos vs. foto real cambia mucho la sensación.
4. **No bloquea morosos.** Un residente con 3 cuotas vencidas debería NO poder reservar (regla común en reglamentos).
5. **No permite invitar/agregar otros residentes a una reserva** (ej. cumple = mi familia + 2 vecinos del piso).
6. **Sin pago de fianza** cuando aplica (Olivos cobra $100 fianza por salón, según seed).

**Recomendaciones**
- Card de área → tap abre **vista calendario semana** con slots ocupados visibles
- Mostrar reglas del área (capacity, rules) prominentemente al iniciar la reserva
- Agregar `image_url` a `common_areas` y mostrar foto real
- Hook al server: si `getInvoicesForUser(unitIds).overdue.count >= 2 && org.policy.block_morosos_reservas` → impedir reserva con mensaje claro
- Multi-residente: campo opcional "co-anfitriones" que permite a otros residentes ver/cancelar la reserva
- Si `common_areas.deposit_required > 0`: pagar/registrar fianza como pre-paso. Devolución manual por admin tras revisión post-evento.

---

#### A6. `/votaciones` — Encuestas y asambleas

**Problemas**
1. **Modelo confuso: `polls` y `assemblies+votes` coexisten.** La UI solo usa `polls`. Las asambleas existen en DB pero no tienen UI. El residente no entiende la diferencia.
2. **Encuestas son simples (1 selección).** Sin SI/NO/Abstención claro.
3. **No hay voto ponderado por alícuota.** En condos legales el voto vale según el % de propiedad — esto es esencial.
4. **Sin quórum tracking visible.** Si hay quórum 50%, debería verse "12/30 votos · 40% · falta 5 para quórum".
5. **Sin documentos adjuntos** (acta, presupuesto, propuesta).
6. **Inquilinos votan solo si la org lo permite** (`tenant_can_vote`) — bien hecho a nivel DB pero la UI no lo refleja claramente.

**Recomendaciones**
- **Unificar terminología**: hablar de **Decisiones**. Cada decisión puede ser votación simple o asamblea.
- Estructura propuesta:
  - **Decisión rápida** (poll): respuesta sí/no/abstención o multi-opción, cierre por fecha. Ej: "¿aprobar nueva tarifa de piscina?"
  - **Asamblea formal**: agenda con N votaciones internas, requiere quórum por alícuota, genera acta exportable PDF.
- Votación ponderada: `vote_responses.weight = unit.aliquot` cuando la votación es por alícuota.
- Atta exportable PDF al cerrar asamblea (para archivos legales).
- Banner "Tu voto cuenta" en /dashboard cuando hay decisión abierta.

---

#### A7. `/comunicados`

**Problemas**
1. **Sin lectura obligatoria.** El admin no sabe quién leyó el urgente "corte de agua mañana".
2. **Sin adjuntos** (PDF reglamento, foto de un daño, plano de obra).
3. **Sin segmentación funcional.** El campo `target_audience` existe en DB ('all' | 'owners' | 'tenants' | 'specific_block') pero no se usa en ningún form/filtro.
4. **Sin canales** — solo aparece en app. No se envía email ni WhatsApp.
5. **Sin "fijar"** comunicados clave (datos bancarios, números de emergencia).

**Recomendaciones**
- `announcement_reads` tabla nueva (announcement_id, profile_id, read_at). Banner persistente hasta que residente da "Entendido". Admin ve % de lectura.
- Storage bucket `announcement-attachments`, soporte PDF/JPG/PNG.
- Selector segmentación al crear: Todos | Solo propietarios | Solo inquilinos | Bloque/torre específico.
- Trigger envío email cuando priority='urgent'. Integración WhatsApp Business API en roadmap (mercado latam lo espera).
- `announcements.is_pinned` boolean — los pinned aparecen primero siempre.

---

#### A8. `/perfil`

**Problemas**
- Solo nombre, email, teléfono. Falta:
  - Avatar upload
  - Documento de identidad (cédula, pasaporte)
  - Contacto de emergencia
  - Vehículos registrados (placa, modelo) → vincular con QR vigilantes
  - Mascotas registradas (nombre, raza) → control en algunos condos
  - Configuración de notificaciones (email sí/no, push sí/no, WhatsApp sí/no por categoría)

---

#### A9. `/mi-unidad` (solo propietario)

**Bien hecho**
- Concepto correcto: el owner gestiona sus inquilinos sin pasar por admin
- Permisos toggleable (`can_see_fee`, `can_pay_fee`)

**Problemas**
1. **Sin historial de inquilinos previos.** El owner no ve "quién vivió aquí en 2024".
2. **Sin documentos del contrato** (PDF del arriendo).
3. **Sin compartir gasto extra con inquilino** (ej: derramas legalmente las paga el owner pero gastos comunes algunos los paga el inquilino).
4. **Sin rotación de pago en el período**: hoy el inquilino paga si tiene `can_pay_fee`, pero no hay "este mes lo pago yo, el siguiente él".

**Recomendaciones**
- Sección "Histórico de inquilinos" con fechas in/out
- Storage para PDF de contrato (privado, solo owner + admin pueden ver)
- Toggle por concepto del fee_breakdown: el owner decide quién paga qué (cuota base inquilino, fondo reserva owner, derrama owner)

---

### B. Flujo del administrador

#### B1. `/admin` — Panel principal

**Bien hecho**
- KPIs claros (unidades, cobranza, morosos, solicitudes)
- Listado morosos sólido
- Cards de comprobantes a aprobar

**Problemas**
1. **Sin filtros temporales.** "Cobranza 87%" — ¿de qué mes? Si hay 4 meses cargados, da promedio mezclado.
2. **Sin enviar recordatorio 1-click a moroso.** Hoy el admin tiene que copiar email manualmente.
3. **Sin gráfico tendencia** (cobranza mes a mes, ingresos vs gastos).
4. **Sin proyección flujo de caja** ("este mes esperas $X recaudar, ya tienes $Y, faltan $Z").
5. **Sin acceso rápido a reportes históricos** (estado mes pasado).

**Recomendaciones**
- Selector mes (default = mes actual). Todas las KPIs se filtran.
- Botón "Recordar pago" en cada moroso → envía email/WhatsApp pre-cargado con el monto + datos bancarios.
- Mini chart sparkline en cada KPI.
- Card "Proyección abril": esperado $1,200 · cobrado $980 · falta $220 (gráfico circular).

---

#### B2. `/admin/units` — Gestión de unidades

**Bien hecho**
- Cards con modo, miembros, invitaciones, códigos en un solo lugar

**Problemas**
1. **Sin import masivo CSV/Excel.** En condos de 100+ unidades, agregar una a una es prohibitivo.
2. **Sin generar 50 códigos a la vez** (caso de uso: condo hace transición y quiere imprimir todos los códigos de una).
3. **No se ve alícuota / área.** Datos legales que importan al admin.
4. **Sin filtros** (por torre, por modo, por status).
5. **Sin búsqueda** ("¿dónde vive Juan Pérez?").

**Recomendaciones**
- Botón "Importar desde Excel": template descargable, mapeo columnas, dry-run preview antes de aplicar.
- "Generar códigos en lote" → modal pide cuántos + role default → genera N códigos y permite descargar PDF imprimible.
- Mostrar `aliquot` y `area_sqm` en cada card.
- Filtros chips arriba: Bloque [A,B,T1,T2] · Modo [3 enum] · Estado [Con miembros / Sin asignar / Pendientes].
- Search box: nombre / email / número de unidad.

---

#### B3. `/admin/settings` — Configuración

**Hoy: 3 toggles. Falta TODO esto:**

1. **Datos del condominio**
   - Logo upload
   - Dirección / RIF / contacto
   - Redes sociales / sitio web

2. **Datos bancarios para pagos** (CRÍTICO — falla #1 de la app)
   - Banco + cuenta + RIF + beneficiario
   - Pago Móvil número
   - Zelle email
   - Stripe API key (cuando se active)

3. **Estructura de cuotas**
   - Editor de `fee_breakdown` (admin agrega/elimina conceptos)
   - **Modo de cálculo**: igual para todos | por alícuota | por tipo
   - Recargo por mora (% mensual)
   - Descuento pronto pago (%)

4. **Documentos del condo**
   - Reglamento interno (PDF)
   - Acta constitutiva
   - Pólizas de seguro
   - Planos

5. **Empleados del condo**
   - Vigilantes (nombre, turno, contacto) → futuro vinculado al rol
   - Conserje
   - Personal limpieza

6. **Notificaciones**
   - Plantillas de email (recordatorio cuota, comprobante aprobado, etc.)
   - Configuración WhatsApp (cuando integrado)

7. **Reglamento operativo**
   - Bloquear morosos en reservas (sí/no, # cuotas)
   - Antelación reservas (mínimo, máximo)
   - Antelación cancelación visitantes

---

#### B4. Generación de cuotas — el bug más grande del producto

**Hoy: un dialog que pide UN MONTO IGUAL para TODAS las unidades.**

Esto es **incorrecto en condos reales**:
- Apartamentos chicos pagan menos que penthouses (alícuota)
- Los locales comerciales pagan diferente
- Las derramas se reparten por alícuota
- A veces cuota fija + variable (consumo agua medido)

**Recomendación: rediseñar el dialog**

Pasos:
1. **¿Qué tipo de cobro?** [ ] Cuota mensual ordinaria | [ ] Derrama extraordinaria
2. **Mes/año de aplicación** + **fecha de vencimiento**
3. **Modo de cálculo:**
   - Igual para todos → un solo monto
   - **Por alícuota** → presupuesto total → app calcula `unit.aliquot × total`
   - **Por tipo** → tabla editable: apartment $85, penthouse $120, local $60
   - **Manual unidad por unidad** → tabla editable
4. **Recargo automático por mora** activado/desactivado
5. **Vista previa** antes de generar (lista de invoices a crear con monto)
6. Generar

Esto requiere:
- Refactor de `generateMonthlyInvoices` action
- Nueva tabla `invoice_runs` (id, org, mode, total_budget, generated_at) para trazabilidad
- Schema invoices ya tiene todo lo necesario

---

#### B5. `/finanzas` (vista admin/residente)

**Hoy:** 4 KPIs + gastos por categoría + detalle de gastos + (admin) crear gasto.

**Lo que falta para ser un módulo contable real:**

1. **Presupuesto anual** aprobado en asamblea (`org_budgets` tabla nueva, items por concepto)
2. **Vista presupuesto vs ejecutado** (mes a mes, acumulado año)
3. **Estado de resultados mensual** (PDF exportable)
4. **Conciliación bancaria** — admin sube extracto bancario, app concilia con transactions registradas
5. **Proveedores** como entidad (`vendors` tabla): nombre, RIF, contacto, histórico de pagos
6. **Cuentas contables**: estructura básica (ingresos por cuotas, ingresos extraordinarios, gastos vigilancia, gastos mantenimiento, fondo reserva, etc.)
7. **Pagos recurrentes** programados (vigilancia mensual fija $580 → genera expense automático cada mes 5)
8. **OCR de facturas** (avanzado, fase 2)
9. **IVA/impuestos** desglose
10. **Centro de costo** (asignar gasto a un área específica: piscina, ascensor T2, fachada → reporta cuánto cuesta mantener cada zona)

**Diferenciador real:** los competidores (ComunidadFeliz, AppFolio) son contadores serios pero feos y caros. Atryum puede ser **el primero que combina contabilidad de verdad con UX moderna**.

**Plan mínimo viable:**
- v1.0: presupuesto anual + ejecutado mes a mes (rectangulares + barras de progreso) + recurring expenses
- v1.1: vendors + estado de resultados PDF
- v2.0: conciliación bancaria + OCR

---

#### B6. Comprobantes (revisión de pagos)

**Bien hecho:** flujo aprobar/rechazar funciona.

**Problemas**
1. **Sin pagos parciales** — un residente que paga $40 de los $85 no puede registrarse correctamente.
2. **Sin notas obligatorias al rechazar** — admin rechaza con un click, residente no sabe por qué.
3. **Sin re-emisión / nota de crédito** si admin se equivoca aprobando.
4. **Sin estado bancario** — admin aprueba a ciegas (¿realmente entró el dinero?).

**Recomendaciones**
- Permitir transactions con `amount < invoice.amount`. Cuando suma de transactions approved < amount → invoice queda en estado nuevo "partial" (DB schema necesita).
- Al rechazar: campo "Razón" obligatorio. Se muestra al residente.
- Acción "Anular pago" con nota → genera transaction inverso.
- Subir extracto bancario como herramienta opcional para verificar.

---

### C. Roles que faltan o están débiles

#### C1. Vigilante (no existe)

**Problema:** todo el flujo de QR muere sin él. El residente genera QR, "se lo envía" (manualmente), y nadie lo escanea.

**Propuesta:**
- Nuevo `role = 'concierge'` en profiles
- UI minimalista (1-2 pantallas): Login → Lista de pases activos del día + cámara para escanear
- Al escanear: valida QR, marca `used_at`, opcionalmente registra placa de vehículo, foto
- Tabla nueva `access_logs` (pass_id, scanned_by, scanned_at, vehicle_plate, photo_url)
- Notificación al residente: "Tu visitante entró a las 18:24"

#### C2. Junta de vecinos (no existe)

**Problema:** algunos condos tienen junta directiva con permisos > residente pero < admin. Hoy todos son "admin" o "resident".

**Propuesta:**
- Tabla `org_committee_members` (org_id, profile_id, role, term_start, term_end)
- Roles: presidente, tesorero, vocal
- UI: pueden ver finanzas detalladas y firmar votaciones formales pero NO crear/cobrar cuotas (eso queda solo admin)

#### C3. Empleados del condo (no existen)

**Problema:** vigilantes, conserje, jardineros — son data importante pero no se modelan.

**Propuesta:**
- Tabla `employees` (org_id, full_name, role, contact, monthly_pay, start_date, end_date, active)
- Vincular con expense_records (gasto categoría 'nomina' permite seleccionar empleado)
- Eventualmente: turnos, vacaciones, evaluación

---

### D. Funcionalidades transversales que faltan

#### D1. Notificaciones

**Hoy:** solo emails de magic link.

**Propuesta priorizada:**
1. **Email transaccional** (Resend ya está): comprobante aprobado/rechazado, nuevo comunicado urgente, recordatorio cuota.
2. **In-app notifications** — campana en header, tabla `notifications` (user_id, kind, payload, read_at).
3. **Push web (PWA)** — el SW se removió pero se puede reintroducir solo para push.
4. **WhatsApp Business API** — el research dijo que es infraestructura en Latam, fallo judicial chileno lo confirma como obligatorio.

#### D2. Reportes / exportación

**Hoy:** nada se exporta.

**Lista mínima viable:**
- **Estado de cuenta del residente** (PDF, mes a mes, acumulado): cuotas, pagos, saldo
- **Estado de resultados del condo** (PDF mensual): ingresos, gastos por categoría, balance
- **Listado de morosos** (PDF para impresión y publicación física en cartelera)
- **Acta de asamblea** (PDF con votaciones y resultados)
- **Reporte fiscal** (consolidado anual de gastos categorizados, útil para contador externo)

Stack sugerido: `@react-pdf/renderer` server-side. Endpoint `/api/reports/[type]?...` que devuelve PDF.

#### D3. Documentos del condo (nuevo módulo)

**Necesidad:** reglamento, acta constitutiva, pólizas, planos, contratos. Hoy no hay donde subirlos.

**Propuesta:**
- Tabla `org_documents` (id, org_id, title, kind, file_url, uploaded_by, visibility)
- Visibility: `public` (residentes lo ven) | `committee` (junta + admin) | `admin_only`
- UI nueva: `/documentos` (residente: solo public) y `/admin/documents` (admin gestiona)

#### D4. Encomiendas / paquetería

**Necesidad muy frecuente:** "te llegó un paquete a vigilancia, retíralo".

**Propuesta:**
- Tabla `parcels` (org_id, unit_id, courier, description, photo_url, received_at, picked_up_at, picked_up_by)
- Vigilante registra paquete cuando llega (1 minuto: courier + foto + unidad)
- Residente recibe push: "tienes paquete de Mercado Libre, retira en vigilancia"
- Al retirar: vigilante registra `picked_up_at`

#### D5. Vehículos y mascotas registrados

**Útil para:** vigilancia (placa de tu auto = no necesita QR), reglas de mascotas (cuántas tiene cada apto).

**Propuesta:**
- Tablas `unit_vehicles` y `unit_pets` con datos básicos
- UI en /perfil para que residente registre

#### D6. Marketplace / tablón de anuncios

**Diferenciador inesperado:** el research dijo que las apps lentas y sin engagement pierden adopción. Un tablón "vendo, busco, regalo" entre vecinos genera retorno semanal.

**Propuesta MVP:**
- Tabla `classified_ads` (org_id, author_id, title, description, photo_url, expires_at)
- Vigencia 30 días, max 1 publicación activa por residente, moderación admin
- Mostrar en /comunidad (sección nueva)

#### D7. Tasa BCV automática

**Hoy:** admin la actualiza a mano.

**Propuesta:**
- Endpoint `/api/cron/exchange-rate` que llama fuente (BCV.org.ve, dolartoday u otra). Ejecuta diario 8am.
- Inserta en `exchange_rates` con `source='bcv_auto'`.
- Admin puede sobrescribir manualmente.

---

## Mapa de prioridades

### Fase 1 — Fundamentos (4-6 semanas, bloqueante para cobrar dinero real)
1. Datos bancarios en Settings + render en /pagos (S)
2. Cuotas por alícuota / tipo / manual (M)
3. Cuotas extraordinarias / derramas (M)
4. Multi-pago de cuotas (S)
5. WhatsApp share del QR (XS)
6. Renombrar UX engañosa ("Reportar pago" → "Subir comprobante", chips de método estáticos eliminados o vinculados)

### Fase 2 — Diferenciación (6-8 semanas)
7. Editor de fee_breakdown + presupuesto anual + ejecutado vs planeado (M)
8. Estado de cuenta PDF (residente) + Estado de resultados PDF (admin) (M)
9. Lectura obligatoria de comunicados + segmentación + adjuntos (M)
10. Disponibilidad real en reservas + bloqueo morosos + foto del área (M)
11. Mantenimiento: tabs Mi/Comunes + comentarios + categorías enum (M)
12. Tasa BCV automática (S)

### Fase 3 — Operación profesional (8-10 semanas)
13. Rol vigilante + escaneo QR + access_logs (M)
14. Encomiendas / paquetería (S)
15. Documentos del condo (S)
16. Notificaciones in-app + push web (M)
17. Empleados del condo + recurring expenses (M)
18. Importación masiva unidades CSV (S)
19. Vendors / proveedores con histórico (S)

### Fase 4 — Asambleas y gobierno (6 semanas)
20. Unificar polls/assemblies en "Decisiones" (M)
21. Voto ponderado por alícuota (S)
22. Asamblea con quórum tracking + acta PDF (M)
23. Junta directiva como rol intermedio (S)
24. Vehículos y mascotas registrados (S)

### Fase 5 — WhatsApp + AI (futuro)
25. WhatsApp Business API (recordatorios cuota, comunicados urgentes)
26. OCR de facturas para gastos
27. Conciliación bancaria automática
28. Marketplace / tablón vecinal

---

## Recomendaciones específicas de UX para residente

**Premisa:** "el residente entra una vez al mes a pagar y reservar la parrilla, todo lo demás es secundario".

1. **Onboarding visual primer login.** Mostrar 3 cards: "Tu apto es X · Tu admin es Y · Saldo $Z".
2. **Botón único persistente "PAGAR"** en bottom-bar móvil cuando hay deuda. Siempre visible.
3. **Móvil-first real.** Test cada flujo en iPhone SE (375px). Hoy el grid de 4 KPIs en /admin se ve bien pero textos largos pueden romper.
4. **Sin selectores de fecha freeform.** Reservas: primero "Hoy / Mañana / Este finde / Próx semana", después calendario.
5. **Confirmaciones que celebran.** "Pago enviado" → animación + emoji opcional. La gente recuerda emocional, no funcional.
6. **WhatsApp button prominente en /perfil.** Click → abre chat con admin, mensaje pre-cargado "Hola, soy [nombre], apto [X], necesito ayuda con...".
7. **Modo oscuro NO.** Adultos mayores 60+ confunden, batería ya no es un problema, contraste WCAG es más fácil de probar en light. (Decisión ya tomada en V3, mantener.)
8. **Mensajes de error humanos.** "Cuenta al día · gracias" beats "0 invoices match status=pending".
9. **Touch targets ≥ 44px.** Auditar buttons size="sm" en /pagos invoice-row, podrían ser inferiores.

## Recomendaciones específicas de UX para administrador

**Premisa:** "es el contador / la junta. Necesita carga rápida y reportes para imprimir o enviar al contador externo".

1. **Pegar Excel funciona.** En el dialog "Importar unidades", aceptar paste directo de Excel (no solo CSV upload).
2. **Atajos de teclado para datos** (admin pasa horas tipeando). En /finanzas/new-expense: enter = guardar y nuevo, esc = cerrar.
3. **Bulk actions.** Listas siempre con checkbox columna izquierda + actions arriba (recordar, marcar como leído, exportar).
4. **Edición inline.** En /admin/units, hacer doble-click al número de unidad debería editarlo (sin abrir modal).
5. **Drafts / no perder trabajo.** Al cerrar dialog accidentalmente, preguntar "¿guardar borrador?" o autosave a localStorage.
6. **Filtros por URL.** `/admin?month=2026-04&block=A` recordable y compartible. Hoy filtros son state local.
7. **Búsqueda global** (Cmd+K). En cualquier página: buscar residente, unidad, factura, gasto.

---

## Lógica de datos: principios para no romper

A medida que se agreguen módulos, mantener estas reglas:

1. **El admin captura siempre como "fuente de verdad".** Si un residente reporta pago, queda como `transactions.status='pending'` hasta que admin aprueba. Nunca confiar en data subida por residente como definitiva.
2. **Quien lo creó lo modifica (con excepciones).** Admin puede sobrescribir todo, pero el log queda. `created_by` y `updated_by` en cada tabla relevante.
3. **Soft-delete > hard-delete.** Para invoices, transactions, expense_records, etc. — `voided_at` con razón vs. `DELETE`. Razones legales y auditoría.
4. **Multi-tenant strict.** Cada query de admin debe filtrar `organization_id = profile.organization_id` (o `view_as` para super_admin). RLS es defensa en profundidad pero la app debe filtrar primero.
5. **Permisos como gates explícitos.** El helper `tenant_has_permission(unit_id, perm)` debe usarse en /finanzas, /votaciones, /pagos, /reservas. Hoy hay un gap (mencionado en `project_audit_v2_done.md`).
6. **Estados como máquinas finitas.** Invoice (pending → paid | cancelled | partial). Maintenance (new → in_review → in_progress → resolved | cancelled). Documentar transiciones válidas; rechazar al resto en server actions.

---

## Observaciones técnicas (no bloqueantes pero importantes)

- **`isAdminRole(profile)` se usa correctamente** en server actions. Mantener este patrón en cualquier action nueva.
- **`window.location.reload()` después de mutations** está bien aplicado. No regresar a `router.refresh()` aún en Next 16.
- **Polls vs votes (assemblies)**: existe deuda técnica — dos tablas con propósito similar. Decidir antes de extender funcionalidad de votación.
- **`maintenance_status_log` se llena pero no se consume.** El historial existe pero la UI no lo muestra. Aprovechar o quitar la tabla.
- **`access_passes.unit_number` es texto libre** — vincular con `unit_id` para coherencia.
- **`exchange_rates` por org**: redundante. Una tasa BCV es global; podría moverse a tabla `global_exchange_rates` y permitir override por org si quiere.
- **Falta tabla `notifications`** — al implementar in-app notifications, diseñar genérica con `kind` enum.
- **`fee_breakdown` no se usa al generar invoices** — el dialog pide un monto plano que ignora el desglose. Cuando se rediseñe la generación, leer fee_breakdown por defecto.

---

## Cierre

Atryum tiene **buena base técnica y excelente identidad visual** (V3 Marine es un activo real). El gap está en **lógica de negocio profunda**:

- El módulo contable es superficial — ahí el diferenciador
- Los flujos de residente prometen cosas que no entregan (WhatsApp del QR, métodos de pago)
- La carga de datos para admin es manual (sin imports) y propensa a errores (cuota plana)

**Si hay que elegir tres cosas para enero 2026:**
1. **Cuotas por alícuota + datos bancarios + multi-pago** → desbloquea cobranza real
2. **Estado de cuenta y de resultados PDF** → diferenciador frente a competencia chapucera
3. **Editor de presupuesto + ejecutado vs planeado** → primer paso a contabilidad real

El resto es construir encima de esos tres pilares.
