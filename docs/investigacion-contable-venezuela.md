# Marco legal y contable de la administración financiera de condominios en Venezuela

**Investigación realizada:** 10 de septiembre de 2026
**Propósito:** insumo para el diseño de un módulo contable dentro de una app SaaS de gestión de condominios (Atryum).

---

## Cómo leer este informe

Cada afirmación lleva una etiqueta:

| Etiqueta | Significado |
|---|---|
| **[LEY]** | Obligación establecida en norma vigente, con artículo citado y texto verificado |
| **[COSTUMBRE]** | Práctica generalizada del sector, no exigida por norma nacional |
| **[OPINIÓN]** | Criterio de una fuente concreta (consultor, software, blog) — no es norma ni consenso |
| **[JURISPRUDENCIA]** | Criterio de tribunales, con la reserva de si es firme o no |
| **[NO VERIFICADO]** | No se pudo confirmar con fuente primaria — **NO usar como base de diseño sin consulta profesional** |

Nivel de confianza: **Alta** (fuente primaria leída textualmente) / **Media** (fuente secundaria seria o varias fuentes coincidentes) / **Baja** (una sola fuente secundaria, o fuentes en conflicto).

---

## ⚠️ Advertencia metodológica importante

Durante la investigación, el resumidor automático de búsqueda web afirmó **dos veces** que existía una *"Ley de Reforma Parcial de la Ley de Propiedad Horizontal publicada en Gaceta Oficial el 8 de septiembre de 2026"*. **Esto es FALSO.**

Al consultar directamente el registro oficial de la Asamblea Nacional se obtuvo:

- Fecha de sanción: **04/08/1983**
- Gaceta Oficial: **N° 3.241 Extraordinario**
- Fecha de publicación: **18/08/1983**
- Deroga: la LPH publicada en G.O. N° 2.341 del 26/09/1978

Fuente primaria: <https://www.asambleanacional.gob.ve/leyes/sancionadas/ley-de-reforma-parcial-de-la-ley-de-propiedad-horizontal> (consultado 2026-09-10).

**Moraleja para el proyecto:** cualquier "novedad legal" que llegue por resumen de IA debe verificarse contra Gaceta Oficial o el registro de la AN antes de tocar código que maneja dinero.

---

## 1. Ley de Propiedad Horizontal venezolana

### 1.1 Norma vigente y su fecha

**[LEY] · Confianza: Alta**

La norma vigente es la **Ley de Propiedad Horizontal**, sancionada el 4 de agosto de 1983, publicada en **Gaceta Oficial N° 3.241 Extraordinario del 18 de agosto de 1983**. Derogó la LPH de 1958 reformada en 1978 (art. 50 LPH).

- Registro oficial AN: <https://www.asambleanacional.gob.ve/leyes/sancionadas/ley-de-reforma-parcial-de-la-ley-de-propiedad-horizontal>
- Texto completo consultado: <https://drcondominio.com/Recursos/02_LPH.pdf> (transcripción de la G.O. 3.241; el pie del documento lo declara expresamente)
- Copia estadal: <https://docs.venezuela.justia.com/estatales/miranda/leyes/ley-de-propiedad-horizontal-1983.pdf>

**No se localizó ninguna reforma posterior a 1983** en el registro oficial de la Asamblea Nacional al 10/09/2026. La ley tiene **43 años sin actualizarse**, lo que explica por qué casi todo lo contable moderno (fondos, presupuestos, multimoneda, morosidad) queda en manos del *documento de condominio* y de la costumbre.

**[LEY] · Confianza: Alta —** El artículo 18 remite a "el Reglamento de la Presente Ley" para las atribuciones de vigilancia de la Junta. **[NO VERIFICADO]** No se localizó un Reglamento nacional de la LPH vigente y publicado. Lo que sí existe y es obligatorio es el **Reglamento de Condominio** de cada edificio, que se acompaña al documento de condominio (art. 26 LPH).

### 1.2 Órganos de administración

**[LEY] · Confianza: Alta — Art. 18 LPH**

> "La administración de los inmuebles de que trata esta Ley corresponderá a la **Asamblea General de Copropietarios**, a la **Junta de Condominio** y al **Administrador**."

Junta de Condominio:
- Mínimo **3 copropietarios + 3 suplentes**
- Designada por la Asamblea, duran **1 año**, reelegibles
- De su seno se elige un **Presidente**
- Debe constituirse en máximo **60 días** tras protocolizarse la venta del 75% de las unidades
- **"Será de obligatorio funcionamiento en todos los edificios regulados por esta Ley"**
- Decide **por mayoría de votos**

Atribuciones de la Junta (art. 18, literales a–e), con la que más importa al módulo contable:

> "e. **Velar por el correcto manejo de los fondos por parte del Administrador**"

**Implicación de diseño:** la Junta es un rol de *auditoría/lectura* sobre la contabilidad, distinto del Administrador que es el rol de *escritura*. La ley separa explícitamente ambos.

### 1.3 El Administrador: designación y responsabilidad

**[LEY] · Confianza: Alta — Art. 19 LPH**

- Designado por la Asamblea **por mayoría de votos**, persona natural o jurídica
- Período de **1 (un) año**, revocable en cualquier momento, reelegible
- **"En todo caso, la responsabilidad del administrador se rige por las normas del mandato"** ← esto es lo que engancha con el Código Civil y la obligación de rendir cuentas
- Debe **prestar garantía suficiente** a juicio de la Asamblea

### 1.4 Obligaciones ADMINISTRATIVAS y CONTABLES del administrador (el artículo clave)

**[LEY] · Confianza: Alta — Art. 20 LPH.** Texto literal de los literales contables:

> **d.** Recaudar de los propietarios lo que a cada uno le corresponda en los gastos y expensas comunes y si hubiere apartamentos rentables propiedad de la comunidad recibir los cánones de arrendamiento y aplicarlos a los gastos comunes; **en caso de que lo recaudado supere a los gastos comunes, los propietarios por mayoría, podrán darle un destino diferente u ordenar su distribución;**

> **f.** **Llevar la contabilidad de los ingresos y gastos** que afecten al inmueble y a su administración, **en forma ordenada y con la especificación necesaria**, así como **conservar los comprobantes respectivos**, los cuales **deberán ponerse a la disposición de los propietarios para su examen durante días y horas fijadas con conocimiento de ellos;**

> **g.** **Llevar los libros de: a) Asamblea de Propietarios, b) Actas de la Junta de Condominio, c) Libro diario de la contabilidad.** Estos libros **deberán ser sellados por un Notario Público o un Juez de Distrito** en cuya jurisdicción se encuentre el inmueble.

> **h.** **Presentar el informe y cuenta anual de su gestión.**

> **Parágrafo Único:** La violación o incumplimiento de cualesquiera de las obligaciones a que se refiere este artículo, por parte del administrador, **dará lugar a su destitución, sin perjuicio de las acciones civiles y penales a que haya lugar.**

**Notas críticas para el diseño:**

1. La ley exige **UN solo libro contable obligatorio: el Libro Diario.** No menciona Libro Mayor, ni Inventarios, ni balance formal. Todo lo demás es costumbre o buena práctica.
2. La ley exige que los libros estén **sellados por Notario o Juez** — no por Registro Mercantil (el condominio no es comerciante). **[COSTUMBRE] · Confianza: Media —** varias fuentes de contadores dicen que en la práctica también se sellan Libro Mayor e Inventarios.
3. El literal (f) es la base legal del **repositorio de comprobantes con acceso de lectura para propietarios**. Un módulo que adjunte facturas/soportes a cada gasto no es un "nice to have": es la forma digital de cumplir el art. 20.f.
4. El literal (h) fija **UNA rendición obligatoria por año**. Todo reporte mensual es costumbre.

### 1.5 Periodicidad y destinatario de cada documento

| Documento | Periodicidad | Ante quién | Estatus |
|---|---|---|---|
| Libro Diario de contabilidad | Continua (asientos) | Disponible a propietarios | **[LEY]** art. 20.g |
| Comprobantes/soportes de gastos | Continua, conservados | Propietarios, en días y horas fijadas | **[LEY]** art. 20.f |
| Libro de Actas de Asamblea de Propietarios | Por asamblea | Propietarios | **[LEY]** art. 20.g, 24 |
| Libro de Actas de Junta de Condominio | Por reunión | Junta | **[LEY]** art. 20.g |
| **Informe y cuenta anual de gestión** | **Anual** | **Asamblea de Copropietarios** | **[LEY]** art. 20.h |
| Recibo / planilla de liquidación de condominio | **Mensual** (de facto) | Cada propietario | **[COSTUMBRE]**, con efecto legal por art. 14 |
| Relación de gastos mensual + estado de cuenta + conciliación bancaria | Mensual | Propietarios y Junta | **[COSTUMBRE]** |
| Presupuesto anual de ingresos y gastos | Anual | Asamblea | **[COSTUMBRE]** — la LPH **no lo regula** |
| Rendición de cuentas mensual/trimestral | Mensual o trimestral | Junta | **[OPINIÓN]** de consultores, como buena práctica |

Fuentes:
- Deberes del administrador, Procondominios, 22/07/2020: <https://procondominios.com.ve/procondoblog/2020/07/22/cuales-son-las-obligaciones-legales-del-administrador-de-condominios-en-venezuela-conocelas/>
- Rendición de cuentas, Odoo Condominio, 24/03/2026: <https://odoocondominio.com/blog/condominios-venezuela-3/la-rendicion-de-cuentas-en-condominios-todo-lo-que-debes-saber-sobre-el-proceso-legal-90>
- Rendición de cuentas (práctica), allcondominium, 10/2014: <https://allcondominium.blogspot.com/2014/10/la-rendicion-de-cuentas-en-el-condominio.html>
- Libros legales y contables, blog Básico de Contadores, 25/06/2017: <http://basicodecontadores.blogspot.com/2017/06/libros-legales-y-contables-de-los_25.html>

### 1.6 Rendición de cuentas: la vía judicial si el administrador no rinde

**[LEY] · Confianza: Media-Alta**

Como la responsabilidad del administrador "se rige por las normas del mandato" (art. 19 LPH), aplica el **Código Civil art. 1.694**: *"Todo mandatario está obligado a dar cuenta de sus operaciones"*. Si no rinde voluntariamente, procede el **juicio de cuentas de los arts. 673–689 del Código de Procedimiento Civil**: el juez intima al administrador a presentar cuentas en **20 días**; si no lo hace, se tienen por ciertos los hechos alegados.

Fuente: Odoo Condominio, 24/03/2026 (citado arriba). **[OPINIÓN]** en cuanto a la interpretación; los artículos citados son verificables pero no se leyó el texto del CPC directamente en esta investigación.

### 1.7 Alícuota / porcentaje de condominio y reparto de gastos

**[LEY] · Confianza: Alta — Art. 7 LPH** (texto literal):

> "A cada apartamento se atribuirá una **cuota de participación con relación al total del valor del inmueble y referida a centésimas del mismo**. Dicha cuota servirá de módulo para determinar la participación en las cargas y beneficios por razón de la comunidad. **Las mejoras o menoscabos de cada apartamento no alterarán la cuota atribuida, que sólo podrá variarse por acuerdo unánime.**"

Puntos duros para el modelo de datos:

1. La alícuota se expresa en **centésimas (porcentaje)** del valor total del inmueble.
2. Se fija en el **documento de condominio** protocolizado (art. 26 LPH: *"fijándose de acuerdo con tales valores el porcentaje que tengan los propietarios sobre las cosas comunes"*).
3. **Solo puede cambiarse por ACUERDO UNÁNIME.** No por mayoría. → una alícuota es un dato casi inmutable, y cualquier cambio debería quedar auditado con referencia al acta.
4. Remodelar o deteriorar un apartamento **no** cambia su alícuota.

**[LEY] · Confianza: Alta — Art. 11 LPH.** Son gastos comunes:
- a. Los causados por **administración, conservación, reparación o reposición de cosas comunes**
- b. Los que se hubieran acordado como tales por **al menos el 75% de los propietarios**
- c. Los declarados comunes **por la Ley o por el documento de condominio**

**[LEY] · Confianza: Alta — Art. 12 LPH:**

> "Los propietarios de apartamentos o locales deberán contribuir a los gastos comunes, **a todos o a parte de ellos**, según los casos, **en proporción a los porcentajes que conforme el artículo 7°, le hayan sido atribuidos.** Sin embargo si existieren bienes comunes cuyo uso se haya atribuido exclusivamente a un apartamento (…) **serán por cuenta del propietario de dicho apartamento la totalidad de los gastos de mantenimiento** de los mencionados bienes así como las reparaciones menores que requieran (…)"

**Implicaciones de diseño de primer orden:**

- Existen **gastos comunes a TODOS** y **gastos comunes a ALGUNOS** ("a todos o a parte de ellos"). El art. 22 lo confirma: *"Lo concerniente a la administración y conservación de las cosas comunes a algunos apartamentos será resuelto por los propietarios de éstos."*
  → El modelo necesita **grupos de prorrateo** (todo el edificio, torre A, solo locales comerciales, solo quienes usan ascensor…), no un único prorrateo global.
- Existe el **gasto individual imputable a una sola unidad** (uso exclusivo de un bien común).
- La regla legal por defecto es **prorrateo por alícuota**. Repartir "en partes iguales" no tiene respaldo en el art. 12; requiere acuerdo (ver §2.3).

**[LEY] · Confianza: Alta — Art. 13 LPH — deuda *propter rem*:**

> "La obligación del propietario de un apartamento o local por gastos comunes, **sigue siempre a la propiedad del apartamento o local, aún respecto de gastos causados antes de haberlo adquirido.**"

→ **La deuda se pega a la unidad, no a la persona.** El módulo contable debe llevar el estado de cuenta **por UNIDAD**, con el propietario como atributo histórico. Un cambio de propietario **no** debe limpiar el saldo.

**[LEY] · Confianza: Alta — Art. 14 LPH — fuerza ejecutiva del recibo:**

> "Las contribuciones para cubrir los gastos podrán ser exigidas por el administrador del inmueble o por el propietario que hubiere pagado sumas que corresponda aportar a otro propietario. Para el efecto de estos cobros, **harán fe contra el propietario moroso, salvo prueba en contrario, las actas de asambleas inscritas en el libro de acuerdos de los propietarios y los acuerdos inscritos por el administrador en dicho libro, cuando estén justificados por los comprobantes que exige esta Ley.**
>
> **Las liquidaciones o planillas pasadas por el administrador del inmueble a los propietarios respecto a las cuotas correspondientes por gastos comunes, tendrán fuerza ejecutiva.**"

**Esto es lo más importante de toda la ley para un módulo contable.** El recibo de condominio **es un título ejecutivo**: permite ir directo a la vía ejecutiva (art. 630 CPC) sin juicio de conocimiento previo. Un recibo generado por el software es un **documento con consecuencias procesales**, no un PDF informativo.

**[LEY] · Confianza: Alta — Art. 15 LPH:** estos créditos gozan de **privilegio sobre los bienes muebles del deudor**, preferente al privilegio del ordinal 4° del art. 1.871 del Código Civil.

Fuente complementaria sobre título ejecutivo: Odoo Condominio, 23/02/2026 — <https://odoocondominio.com/blog/conocimiento-sobre-condominios-1/el-recibo-de-condominio-como-titulo-ejecutivo-seguridad-juridica-frente-a-la-morosidad-en-venezuela-82> (cita art. 14 LPH, art. 630 CPC, art. 1.977 CC prescripción 20 años, arts. 12–13 LPH naturaleza *propter rem*). **[OPINIÓN]** en cuanto al análisis; los artículos LPH sí fueron verificados en texto primario.

### 1.8 Cosas comunes (base del catálogo de gastos)

**[LEY] · Confianza: Alta — Art. 5 LPH.** Son comunes a todos: terreno, cimientos y estructura, techos, galerías, vestíbulos, escaleras, **ascensores**, vías de entrada/salida, azoteas, patios, jardines, sótanos, **locales de administración, vigilancia o alojamiento de porteros**, locales de seguridad/deportivos/recreo/reunión social, **instalaciones de servicios centrales (electricidad, luz, gas, agua fría y caliente, refrigeración, cisterna, tanques y bombas de agua)**, incineradores de residuos, puestos de estacionamiento y maleteros declarados como tales, y **los apartamentos/locales rentables cuyos frutos se destinen al pago de gastos comunes**.

→ Esta lista es prácticamente el **catálogo natural de centros de gasto** de un condominio venezolano.

### 1.9 Mayorías relevantes (para el flujo de aprobación)

| Decisión | Mayoría | Artículo |
|---|---|---|
| Designar/revocar Administrador | Mayoría de votos de la Asamblea | 19 |
| Decisiones de la Junta de Condominio | Mayoría de votos | 18 |
| Declarar un gasto como común (por acuerdo) | **75% de los propietarios** | 11.b |
| Mejoras de cosas comunes | **75%** | 9 |
| Servidumbres para servicios comunes | **75%** | 3.c |
| División de cosas comunes | **2/3 de la Asamblea** | 8 |
| Acuerdos por consulta escrita (1ª vuelta) | Mayoría de interesados que representen **≥ 2/3 del valor** | 23 |
| Acuerdos por consulta escrita (2ª vuelta) | **> 1/2 del valor** de los que respondieron | 23 |
| Construir pisos nuevos, sótanos, excavaciones | **Unanimidad** | 10 |
| **Cambiar alícuotas** | **Unanimidad** | 7 |
| Modificar el Documento de Condominio | **Unanimidad** | 29 |
| Dar destino distinto al excedente recaudado | Mayoría de propietarios | 20.d |
| Convocar asamblea (exigirla al administrador) | **1/3 del valor básico** del inmueble | 24 |
| Impugnar judicialmente un acuerdo | Cualquier propietario, **30 días** | 25 |

---

## 2. El recibo de condominio

### 2.1 ¿Hay formato legal obligatorio?

**[LEY] · Confianza: Alta —** La LPH **NO establece un formato ni un contenido mínimo** para el recibo. Solo dice (art. 14) que *"las liquidaciones o planillas pasadas por el administrador (…) tendrán fuerza ejecutiva"*, y (art. 14, primer aparte) que las actas y acuerdos hacen fe contra el moroso **"cuando estén justificados por los comprobantes que exige esta Ley"**.

→ **No hay mínimo legal de formato. Pero sí hay un mínimo funcional:** para que el recibo sirva como título ejecutivo debe (a) emanar del administrador, (b) referirse a cuotas por gastos comunes, y (c) estar respaldado por los comprobantes del art. 20.f.

**[NO VERIFICADO]** No se pudo confirmar si el recibo de condominio debe cumplir requisitos de la **Providencia SNAT/2011/0071** de facturación del SENIAT. La lógica dominante es que **no**, porque el condominio no presta un servicio gravado (ver §4), pero **no se localizó pronunciamiento expreso**. **No diseñar el recibo como factura fiscal sin consulta profesional.**

### 2.2 Estructura típica del recibo venezolano

**[COSTUMBRE] · Confianza: Media-Alta.** Convergen varias fuentes en una estructura de tres bloques:

**Encabezado**
- Identificación del edificio / conjunto residencial
- Identificación del propietario
- Número de inmueble / unidad
- Período de facturación (mes)
- **Alícuota aplicable** de la unidad
- Monto total a pagar

**Cuerpo — relación detallada de gastos del período**
- **Gastos comunes / generales**: los prorrateados por alícuota (vigilancia, conserjería, ascensor, electricidad de áreas comunes, agua, limpieza, honorarios de administración…)
- **Gastos no comunes / individuales**: imputables solo a esa unidad (reparación causada por el propietario, gastos de cobranza)
- **Ingresos generales** (a restar): alquiler de salón de fiestas, alquiler de azotea a telefónicas, etc.
- **Ingresos individuales** (reembolsos a ese propietario)

**Pie**
- **Fondo de reserva**
- **Prestaciones sociales del personal** (apartado)
- Saldo anterior / estado de morosidad
- Intereses de mora
- Información general de la comunidad
- **Medios de pago** (depósito, transferencia o cheque; la fuente recomienda expresamente **nunca efectivo**)

Fuentes:
- El Condominio Feliz, 04/2010: <https://elcondominiofeliz.blogspot.com/2010/04/recibo-de-condominio.html>
- Odoo Condominio, 23/02/2026 (título ejecutivo, requisitos de validez del recibo)

### 2.3 Fórmula de cálculo usada en la práctica

**[COSTUMBRE / OPINIÓN de proveedor] · Confianza: Media.** El proveedor venezolano condominiosvenezuela.com publica la fórmula que usa su software (artículo de Jesús García, **05/11/2016**):

```
CMC = CO + CE + CI

CO (Cuota Ordinaria) = ( (TG + TF – TI) × (AC / TA) ) + Σ(GI) – Σ(II)

TG = Total Gastos generales
TF = Total de los Fondos (reserva, etc.)
TI = Total Ingresos generales
AC = Alícuota Correspondiente de la unidad
TA = Total de Alícuotas del condominio
GI = Gastos Individuales de esa unidad
II = Ingresos Individuales (reembolsos) de esa unidad

CE (Cuota Especial) = suma de cuotas especiales aprobadas en asamblea para el período
CI (Cuota por Intereses) = Deuda × (%I / 100)
```

Fuente: <https://soporte.condominiosvenezuela.com/?v=knowledgebase&action=4&param%5B%5D=article&param%5B%5D=5&param%5B%5D=cmo-calcular-la-cuota-de-condominio>

**Dos detalles muy relevantes para el diseño, ambos aprendidos "en carne propia" por ese proveedor:**

1. **`TA` (total de alícuotas) NO siempre suma 100.** Cita textual: *"por experiencia hemos detectado errores en muchos documentos de condominios y la suma de sus alícuotas no siempre resulta da el valor 100 y al tomar como referencia el total de la sumatoria de las alícuotas aseguramos que los gastos comunes sean cubiertos en su totalidad"*.
   → **El módulo debe dividir entre la suma real de alícuotas, no asumir 100.** Y debería mostrar una alerta cuando la suma ≠ 100. Este es un bug clásico que deja gastos sin cubrir.

2. **Ese proveedor reparte la Cuota Especial EN PARTES IGUALES**, no por alícuota: *"las cuotas especiales se pagan por igual entre todos los propietarios, es decir, no es afectada por la alícuota establecida"*.
   → **[OPINIÓN] · Confianza: Baja como regla general.** Esto **no** tiene respaldo en el art. 12 LPH, que manda prorratear en proporción a la alícuota. Es una convención de ese software. **El módulo debería permitir ambas bases de reparto (por alícuota / partes iguales / grupo específico) y dejar que el condominio elija según su documento de condominio o acta de asamblea, en vez de imponer una.**

En el ejemplo numérico del artículo, el **Fondo de Reserva se calcula como 10% de los gastos generales** (Bs 360.000 × 10% = Bs 36.000) y se suma a la base prorrateable.

### 2.4 Intereses de mora

**[LEY] · Confianza: Media-Alta.** La LPH **no fija tasa de mora**. Aplica el Código Civil:

- **Art. 1.277 CC:** a falta de convenio, los daños por retardo en obligaciones dinerarias consisten en el **interés legal**.
- **Art. 1.746 CC:** el **interés legal es el 3% anual**; el interés convencional puede pactarse hasta un límite (12% anual en materia civil).

**[OPINIÓN] · Confianza: Media —** La deuda de condominio es de **naturaleza CIVIL, no mercantil**, porque la administración de condominios no está calificada como actividad comercial en el Código de Comercio. Por tanto aplica el 3% civil, no el 5% mercantil.

Regla práctica que se repite en las fuentes:

| Escenario | Tasa | Requisito |
|---|---|---|
| Sin acuerdo de asamblea | **3% anual** (legal) | Automático |
| Con acuerdo de asamblea | hasta **12% anual (1% mensual)** | **Acta de asamblea que lo apruebe** |

**[LEY] · Confianza: Alta —** Está prohibido el **anatocismo**: no se pueden cobrar intereses sobre intereses. La indexación monetaria, si se aplica, va **solo sobre el capital**, nunca sobre los intereses acumulados.

**[OPINIÓN] · Confianza: Media —** Es ilegal presionar al moroso suspendiéndole servicios básicos o bloqueándole llaves/accesos.

Fuentes:
- Odoo Condominio, 27/10/2024: <https://odoocondominio.com/blog/conocimiento-sobre-condominios-1/interes-moratorio-3-o-12-cual-aplicar-en-deudas-vencidas-de-condominio-32>
- Tal Cual (vías legales contra morosos): <https://talcualdigital.com/estas-son-las-vias-legales-para-obligar-a-morosos-a-pagar-a-los-condominio/>
- condominiosvenezuela.com (ejemplo usa 3%): ver §2.3

**[NO VERIFICADO]** Se intentó leer la sentencia de la Sala Constitucional del TSJ N° 960 del 23/07/2015 (exp. 13-1043) sobre intereses en recibos de condominio, pero el portal del TSJ devolvió 403. Una fuente secundaria (Odoo, 23/02/2026) afirma que la Sala Constitucional sostuvo que *incluir intereses de mora no desnaturaliza el título ejecutivo* ("lo accesorio sigue a lo principal"). **Tratar como no confirmado.**

### 2.5 Contexto de mercado: la morosidad es el problema central

**[Dato de prensa] · Confianza: Media** (declaraciones de ONG especializada, no estadística oficial):

- **Morosidad promedio ~40%** en condominios venezolanos — Tibaire Altuve, coordinadora nacional de MiCondominio.com (marzo 2025).
- **51% de los condominios en "alerta amarilla"**, 7% en riesgo de colapso — diagnóstico de Elías Santana (mayo 2025).
- **~50% en riesgo de colapso operativo y financiero** (agosto 2025).

Fuentes: <https://finanzasdigital.com/morosidad-condominios-venezuela-2025-desalojo-crisis-financiera/> · <https://www.elnacional.com/2025/08/condominios-en-venezuela-en-riesgo-de-colapso-por-morosidad/> · <https://theelnews.org/2025/05/08/elias-santana-el-51-de-los-condominios-en-venezuela-estan-en-alerta-amarilla/>

→ **El módulo de morosidad no es un accesorio del contable: es probablemente su función más valiosa en Venezuela.**

---

## 3. Fondos y reservas

### 3.1 Fondo de reserva: NO es obligatorio por ley

**[LEY] · Confianza: Alta.** Se hizo búsqueda de texto completo sobre la LPH 1983: **las palabras "fondo de reserva" y "reserva" NO aparecen en toda la ley.** La única mención a fondos es el art. 18.e (*"Velar por el correcto manejo de los fondos por parte del Administrador"*), que presupone que existen pero no los crea ni los regula.

**[OPINIÓN] · Confianza: Media —** Procondominios (16/04/2017) lo llama expresamente *"un tremendo vacío"* de la LPH: el fondo de reserva **no está mandado por ley**, se establece en el **documento de condominio** de cada edificio o por acuerdo de asamblea.
<https://procondominios.com.ve/procondoblog/2017/04/16/el-fondo-de-reserva-y-la-ley-de-propiedad-horizontal-de-venezuela-utilidad/>

### 3.2 Cómo se constituye y qué porcentaje se acostumbra

**[COSTUMBRE] · Confianza: Media.** Dos mecanismos, generalmente combinados:

1. **Aporte inicial** fijado en el contrato de compraventa de cada apartamento (lo establece la promotora en el documento de condominio).
2. **Alimentación mensual**: un **porcentaje del total de gastos comunes del mes**, que el administrador suma al recibo.

**Porcentaje observado: 10%.** Dos fuentes independientes coinciden:
- El Condominio Feliz (04/2010): *"el 10% del Recibo"* destinado a fondo de reserva.
- condominiosvenezuela.com (05/11/2016): el ejemplo numérico usa "Fondo de Reserva (10%)".

**[NO VERIFICADO]** No se localizó ninguna norma que fije ese 10%. Es **costumbre de mercado, no exigencia legal**. El módulo debe permitir configurarlo libremente (% de gastos comunes, monto fijo, o ambos) y no hardcodear 10%.

### 3.3 Cómo se contabiliza y dónde se guarda

**[COSTUMBRE / OPINIÓN] · Confianza: Media.** Hay disenso genuino entre fuentes:

- Procondominios: los fondos **pueden estar en la misma cuenta bancaria** que los gastos comunes; muchas juntas los separan en cuentas distintas *"quizás creyendo que eso hace más transparente la administración y su ubicación"*, pero **múltiples cuentas complican la supervisión contable profesional**.
- **[OPINIÓN] · Confianza: Baja —** El mismo autor recomienda, dada la inflación venezolana, **NO acumular efectivo** en el fondo de reserva sino invertirlo de inmediato en mantenimiento preventivo/correctivo/predictivo, porque el dinero pierde valor. (Artículo de 2017, cuando la inflación anual se citaba en 2.000%.)

**Consecuencia de diseño:** la separación del fondo de reserva debe ser **contable (cuenta de pasivo/patrimonio restringido)**, independiente de si está en una cuenta bancaria separada. El módulo debe soportar ambos casos: N fondos lógicos sobre M cuentas bancarias.

**[COSTUMBRE] · Confianza: Media —** El uso del fondo de reserva debería someterse a **aprobación de asamblea de propietarios legalmente convocada**, más allá de lo que diga el documento de condominio.

### 3.4 Otros fondos habituales

**[COSTUMBRE] · Confianza: Media.** Fondos que aparecen en recibos venezolanos:

| Fondo | Propósito | Notas |
|---|---|---|
| **Fondo de reserva** | Reparaciones mayores, imprevistos | El más universal, ~10% |
| **Fondo de prestaciones sociales** | Respaldar la antigüedad y liquidación del personal (conserje, vigilante) | Ver §4.2 — este sí tiene raíz legal indirecta vía LOTTT |
| **Fondo de emergencia** | Contingencias operativas inmediatas | |
| **Fondo de obras** | Obra o mejora específica ya aprobada | Suele levantarse como **cuota especial/derrama** |

**[OPINIÓN] · Confianza: Baja —** El Condominio Feliz critica prácticas donde se cobran *"3 fondos para futuros gastos"* sin justificación clara. → Señal de que el módulo debería **exigir referencia al acta o al documento de condominio que crea cada fondo**, y mostrar el saldo y movimientos de cada uno.

**Sobre el fondo de prestaciones sociales — [COSTUMBRE] · Confianza: Media:** varias administradoras describen que el apartado de prestaciones del personal se coloca en una **cuenta de activos líquidos o fideicomiso a nombre de los empleados del edificio, con firma conjunta con el Administrador**, y contabilizado de forma individualizada por trabajador. El fideicomiso de prestaciones es un producto bancario estándar en Venezuela (ej. BFC: <https://www.bfc.com.ve/fideicomiso-prestaciones-sociales/>).

---

## 4. Obligaciones laborales y tributarias del condominio

### 4.1 ¿El condominio es contribuyente? ¿Tiene RIF?

Esta es **la zona más ambigua y más riesgosa** de todo el informe. Hay un **conflicto real entre la práctica del SENIAT y los tribunales**.

**RIF — [COSTUMBRE/PRÁCTICA] · Confianza: Media-Alta.** Sí, en la práctica el condominio tiene RIF. Existe la categoría **"RIF de Comunidad"**, descrita como *"para comunidades organizadas con fines específicos, como condominios o juntas de vecinos"*. Es indispensable para abrir cuenta bancaria a nombre del condominio.
Fuente: <https://portalseniat.com/tipos-de-rif/>
**[NO VERIFICADO]** No se pudo confirmar la **letra inicial** que usa el RIF de comunidad. La fuente lista V/E/J/G/P pero no asigna letra explícita a "Comunidad". **Verificar con SENIAT antes de validar formato de RIF en el software.**

**Declaración de ISLR — [PRÁCTICA SENIAT] · Confianza: Media-Alta.**

Caso documentado (noviembre 2022): el SENIAT multó a la junta de condominio del **Edificio Capri, La Urbina, Caracas** con **Bs 8.116 (≈ USD 939)** por **no declarar ISLR ni IVA entre 2016 y 2020**. Elías Santana (fundador de MiCondominio.com) declaró:

> *"Los condominios tienen la obligación de declarar el ISLR antes del 31 de marzo, como ocurre con cualquier persona natural o jurídica, ya que para el Seniat, los condominios tienen una identidad fiscal a pesar de que usualmente no tengan la obligación de pagar impuestos, sino solo declararlos."*

> *"El condominio es una unión de ciudadanos para mantener una propiedad común por eso solo hay ingresos y egresos. Hay situaciones que si el condominio tiene un acuerdo con una empresa telefónica para el uso de la azotea o una empresa de publicidad para una valla publicitaria, **entonces cambia la figura del condominio que se vuelve un contribuyente. En ese caso sí se debe tener facturas Seniat y deben cobrar el IVA**"*

Estimó que **8 de cada 10 condominios no saben que deben declarar**.
Fuente: Tal Cual, **4 de noviembre de 2022** — <https://talcualdigital.com/condominios-no-declaran-ante-el-seniat-por-desconocimiento-y-reciben-multas-de-1-000/>

**[JURISPRUDENCIA] · Confianza: Media — los tribunales dicen lo contrario.**

Acceso a la Justicia (**22 de noviembre de 2022**) documenta que el SENIAT contradijo criterio judicial:
<https://accesoalajusticia.org/seniat-ignora-criterios-juzgados-tributarios-imponer-multa-1000-dolares-condominio/>

- **Tribunal Superior de lo Contencioso Tributario de la Región Central, sentencia n.° 0847 del 3 de junio de 2010** (caso Junta de Condominio del C.C. Valencia Plaza):
  > *"La Junta de Condominio no tiene propiedad sobre los bienes, simplemente administra su mantenimiento por orden de los condóminos aportando las cuotas para sufragar los gastos de mantenimiento. Los condóminos son los copropietarios del inmueble y una comunidad que declara sus impuestos en cabeza de cada uno de ellos."*
  > *"La Junta de Condominio no presta servicios independientes, puesto que sufraga sus propios gastos no con ingresos sino con aportes de los condominios, por lo cual mal podría catalogarse como sujetos pasivos del impuesto al valor agregado."*

- **Tribunal Superior de lo Contencioso Tributario de la Región Los Andes** (caso Condominio del Unicentro El Ángel): la fiscal *"partió de un hecho falso, como es la sujeción del sujeto investigado al cumplimiento de esas normas (…) no da lugar a la verificación del hecho imponible en dichos impuestos"*, y añade que exhibir el RIF *"no es exigible a aquellos sujetos que en virtud de su situación en nada se vinculan al tributo"*.

- **TSJ, Sala Político Administrativa (2011):** dejó firme el criterio de la Región Central, pero **solo por no alcanzarse la cuantía mínima para recurrir**, no por pronunciamiento de fondo. → **No hay criterio definitivo del TSJ.**

- **Causa del vacío:** *"ni el decreto-ley del ISLR ni el del IVA establecen expresamente que estas instancias están exentas del pago de este impuesto. En virtud de esta laguna legal, los condominios deben declarar anualmente el ISLR para evitar cualquier multa o sanción."*

**Conclusión operativa para el producto — Confianza: Alta:**
> Legalmente el condominio **no es contribuyente** de ISLR ni de IVA sobre las cuotas (criterio de tribunales de instancia, no firme en TSJ). **Pero en la práctica el SENIAT los fiscaliza y multa**, y el consejo generalizado del sector es **declarar ISLR anualmente antes del 31 de marzo, aunque sea en Bs 0**. El condominio **sí se vuelve contribuyente** cuando genera ingresos de terceros (alquiler de azotea a telefónicas, vallas publicitarias, alquiler de salón, locales rentables del art. 5.l LPH).

**Nota de conflicto de fuentes:** Odoo Condominio (24/03/2026) afirma que los condominios están *"exentos de ISLR como entidades sin fines de lucro"*. **Eso es [OPINIÓN] de un proveedor y contradice tanto la práctica del SENIAT como el análisis de Acceso a la Justicia sobre la laguna legal.** No usarlo como base de diseño.

### 4.2 ¿Retiene ISLR o IVA a proveedores?

**[NO VERIFICADO] · Confianza: Baja — ZONA DE RIESGO.**

- El **Decreto 1.808** (Reglamento Parcial de la LISLR en materia de retenciones) lista entre los obligados a retener a los deudores/pagadores de sueldos, honorarios profesionales sin relación de dependencia, comisiones y arrendamientos, e incluye expresamente a los **"administradores de bienes inmuebles"** entre las entidades obligadas a retener.
- No se localizó fuente que afirme o niegue explícitamente que **la junta de condominio** (como comunidad) sea agente de retención de ISLR.
- **Retención de IVA:** solo aplica a **contribuyentes especiales** designados por el SENIAT. Un condominio ordinario no lo es. **[Confianza: Media]**

**Recomendación:** modelar la retención como **capacidad opcional configurable** (el condominio o su administradora puede estar designada agente de retención), nunca como comportamiento por defecto, y **advertir en el producto que esto requiere validación de un contador venezolano.**

Fuentes de referencia (no concluyentes): <https://naymaconsultores.com/quienes-deben-hacer-retenciones-de-islr-en-venezuela/> · <https://naymaconsultores.com/retenciones-de-iva-en-venezuela/>

### 4.3 Obligaciones laborales si el condominio tiene empleados

**[LEY] · Confianza: Alta.** Si el condominio tiene conserje, vigilante o personal de mantenimiento, **el condominio es PATRONO** y responde como tal. Las fuentes del sector advierten que, ante incumplimiento, **la junta de condominio es demandada y debe responder**.

#### Contribuciones parafiscales (porcentajes 2026)

| Concepto | Patrono | Trabajador | Base | Periodicidad |
|---|---|---|---|---|
| **IVSS** (Seguro Social Obligatorio) | **9%–11%** según riesgo | **4%** | Salario, tope **5 salarios mínimos** (art. 62 LSS) | Cotización **semanal**, pago mensual |
| **RPE** (Régimen Prestacional de Empleo / "paro forzoso") | **2%** | **0,5%** | Salario normal, base semanal | Mensual |
| **FAOV / BANAVIH** | **2%** | **1%** | **Salario integral** (total 3%) | **Mensual** |
| **INCES** | **2%** de la **nómina trimestral total** | **0,5%** de las utilidades | Nómina / utilidades | Patrono **trimestral**; trabajador **1 vez al año en diciembre** |
| Retención ISLR a trabajadores | — | Según AR-I | — | Mensual |

Fuentes (coincidentes entre sí): <https://portalseniat.com/calcular-ivss-inces-faov/> · <https://www.sistematemis.com/deducciones-de-nomina-en-venezuela/> · <https://www.sistematemis.com/rpe-regimen-prestacional-empleo-venezuela/> · <https://naymaconsultores.com/obligaciones-fiscales-parafiscales-nomina-venezuela/>

**Detalle importante — [Confianza: Media]:** el **INCES patronal se calcula sobre la nómina TRIMESTRAL, no sobre el salario individual mensual**, y **no aparece en el recibo de pago mensual del trabajador**. Si un sistema de nómina descuenta "INCES" mensualmente al trabajador, está mal.

#### Prestaciones sociales, utilidades y vacaciones (LOTTT)

| Concepto | Regla | Artículo LOTTT | Periodicidad |
|---|---|---|---|
| **Garantía de prestaciones sociales** | Depósito de **15 días de salario cada trimestre**, calculado con el último salario devengado | **Art. 142** | **Trimestral** |
| **Días adicionales de antigüedad** | 2 días por año a partir del 2° año, acumulativos, máx. 30 días | Art. 142 | Anual |
| **Utilidades / participación en beneficios** | Mínimo **30 días** de salario, máximo 4 meses | **Art. 131** | Anual |
| **Bonificación de fin de año** | Al menos **30 días de salario**, pagaderos en los **primeros 15 días de diciembre** | **Art. 132** | Anual (diciembre) |
| **Vacaciones** | **15 días hábiles** al cumplir 1 año + 1 día adicional por año | **Art. 190** | Anual |
| **Bono vacacional** | Mínimo **15 días** de salario normal + 1 día por año adicional | **Art. 192** | Anual |
| Cesta ticket / bono de alimentación | Fijado por el Ejecutivo | — | Mensual |

Fuentes: <https://www.ley.com.ve/laboral/lottt-articulo-142-garantia-y-calculo-de-prestaciones-sociales> · <https://tugacetaoficial.com/laboral/lottt-articulo-131/> · <https://finiquitojusto.com/derechos-laborales/prestaciones-sociales-venezuela/>

**[NO VERIFICADO] · Importante para condominios:** la aplicación exacta del art. 131 (utilidades por "beneficios líquidos") a una entidad **sin fines de lucro** como un condominio, que no genera enriquecimiento gravable, no quedó confirmada con fuente primaria. La lectura dominante es que se paga la **bonificación de fin de año de 30 días del art. 132**. **Confirmar con laboralista antes de automatizar el cálculo.**

**[COSTUMBRE / OPINIÓN] · Confianza: Baja-Media —** El ingreso mínimo integral 2026 se cita en **USD 240** por exhorto del Ejecutivo Nacional de abril 2026 (**"pendiente publicación en Gaceta Oficial"** según la propia fuente), tras el criterio de USD 40 ratificado por la Sala Social del TSJ en diciembre 2024. **Dato volátil y no confirmado en Gaceta — el módulo NO debe hardcodear salarios mínimos; deben ser parámetros editables con fecha de vigencia.**
Fuente: <https://odoocondominio.com/blog/condominios-venezuela-3/actualizacion-laboral-condominios-venezuela-2026-92> (07/05/2026)

---

## 5. Inflación y multimoneda

Esta es, junto con la morosidad, la sección que más condiciona la arquitectura del módulo.

### 5.1 ¿En qué moneda se llevan los libros?

**[LEY] · Confianza: Alta**

- **CRBV art. 318:** *"La unidad monetaria de la República Bolivariana de Venezuela es el Bolívar"*. <https://www.ley.com.ve/constitucion/constitucion-de-la-republica-bolivariana-de-venezuela-articulo-318>
- **Código de Comercio art. 32:** obliga a llevar la contabilidad **en castellano** e incluir Diario, Mayor e Inventarios.
- **[NO VERIFICADO]** Varias fuentes secundarias afirman que el art. 32 del Código de Comercio obliga a llevar los libros **en bolívares**. **No se localizó ese texto literal.** La obligación de bolívares se deriva del art. 318 CRBV + art. 128 Ley del BCV + normativa fiscal, no de una frase explícita del Código de Comercio. Es **criterio profesional dominante, no cita literal.**

**Conclusión operativa:** los **libros legales van en bolívares**; llevar auxiliares o presupuesto en USD es **[COSTUMBRE]** aceptada.

### 5.2 El artículo que gobierna toda la multimoneda venezolana

**[LEY] · Confianza: Alta — Ley del BCV, art. 128:**

> *"Los pagos estipulados en monedas extranjeras se cancelan, salvo convención especial, con la entrega de lo equivalente en moneda de curso legal, **al tipo de cambio corriente en el lugar de la fecha de pago**."*

De aquí sale la distinción que hay que modelar sí o sí:

| Concepto | Significado | Régimen |
|---|---|---|
| **Moneda de cuenta** | El USD sirve para **medir** la obligación; se paga en Bs a la tasa del día de pago | **Por defecto** |
| **Moneda de pago** | Se exige entrega física de divisas | Solo con **"convención especial"** expresa |

**[JURISPRUDENCIA] · Confianza: Media-Alta — TSJ Sala Constitucional, sentencia N° 1.641 del 2 de noviembre de 2011, caso Motores Venezolanos C.A. (MOTORVENCA).** Es la sentencia madre: es lícito pactar obligaciones en moneda extranjera, pero **el pago hecho en territorio venezolano tiene efecto liberatorio en bolívares, a la tasa oficial vigente el DÍA DEL PAGO** (no la del día del contrato), salvo convención especial. Ratificada por la Sala de Casación Civil en 2022.

- <https://accesoalajusticia.org/tsj-venezolano-permite-contratacion-pago-moneda-extranjera/>
- <https://badellgrau.com/sala-de-casacion-civil-del-tsj-ratifico-que-las-obligaciones-expresadas-en-moneda-extranjera-deben-pagarse-en-bolivares-a-la-tasa-de-cambio-oficial-vigente-a-la-fecha-del-pago/>
- <https://tugacetaoficial.com/jurisprudencia/jurisprudencia-pago-moneda-extranjera/>

**[LEY] · Confianza: Alta — Convenio Cambiario N° 1**, Gaceta Oficial **N° 6.405 Extraordinario del 7 de septiembre de 2018** (firmado 21/08/2018): establece la **libre convertibilidad** de la moneda en todo el territorio nacional y desmonta el control de cambios.
<https://www.bcv.org.ve/system/files/documentos_juridicos/convenio_cambiario_ndeg_1_de_fecha_7-09-2018_1.pdf>

**[LEY] · Confianza: Media — Providencia SNAT/2011/00071**, Gaceta Oficial **N° 39.795 del 8 de noviembre de 2011**: cuando el precio se expresa en moneda extranjera, el documento debe indicar **también el equivalente en bolívares y el tipo de cambio del BCV usado**.
**[NO VERIFICADO]** No se pudo extraer el **número de artículo exacto** de la Providencia que regula el caso de moneda extranjera. Y — ver §2.1 — **tampoco está confirmado que el recibo de condominio esté sujeto a esta Providencia.**
<https://www.medisoftware.site/Download/Normas/Providencia0071.pdf>

### 5.3 La mayoría para "dolarizar": ojo con un mito repetido

**[OPINIÓN] · Confianza: Baja — CORRECCIÓN IMPORTANTE.**

Prácticamente todas las fuentes del sector repiten que *"se necesita 75% de la asamblea para dolarizar el condominio"*. Ese **75% aparece en el art. 11.b LPH referido a acordar nuevos gastos comunes, NO a la moneda**. El art. 23 exige dos tercios del valor para acuerdos por consulta escrita.

**No se localizó ninguna norma que fije una mayoría para elegir la moneda de cuenta.** Tratar el "75% para dolarizar" como interpretación profesional, no como texto legal.

Fuentes que sostienen la legalidad del cobro en USD como unidad de cuenta (todas **[OPINIÓN]** de despachos):
<https://www.aslegabogados.com/cobro-cuotas-condominio-dolares/> · <https://www.ghm.com.ve/cobro-en-dolares-esta-a-la-orden-del-dia/> · <https://omnia.legal/2022/05/16/obligacion-en-moneda-extranjera/>

### 5.4 Tasa BCV y diferencial cambiario

**[OFICIAL] · Confianza: Alta.** El tipo de cambio oficial del BCV es el **promedio ponderado de las operaciones diarias de las mesas de cambio de las instituciones bancarias participantes**, publicado diariamente con fecha valor.
<https://www.bcv.org.ve/seccionportal/tipo-de-cambio-oficial-del-bcv> — referencia **10/09/2026: 827,7371 Bs/USD**.

**[NORMA CONTABLE] · Confianza: Alta — NIC 21 (dentro de VEN-NIF):**
1. **Reconocimiento inicial:** la transacción en moneda extranjera se registra en moneda funcional (Bs) a la **tasa de contado de la fecha de la transacción**.
2. **Al cierre:** las **partidas monetarias** (cuentas por cobrar/pagar en divisa, caja en divisa) se reconvierten a la **tasa de cierre**.
3. La diferencia entre la tasa histórica y la de cobro/cierre es **diferencia en cambio → resultado del período**.

<https://cyfcontable.com/nic-21-efectos-de-las-variaciones-en-las-tasas-de-cambio-de-la-moneda-extranjera-aspectos-claves-para-profesionales-contables/> · <https://sagca.com/reportesag017/>

**El problema real del condominio — [COSTUMBRE] · Confianza: Media.** El recibo se emite el día X con tasa T1; el propietario paga el día X+9 con tasa T2. Hay **dos modelos en uso**:

| Modelo | Cómo funciona | Consecuencia |
|---|---|---|
| **(a) Cláusula de ajustabilidad** | El monto en Bs se **recalcula a la tasa del día de pago** | El condominio no pierde. Requiere aprobación de asamblea y que esté escrito en el recibo. Alineado con art. 128 Ley BCV y MOTORVENCA |
| **(b) Tasa congelada al emitir** | El monto en Bs queda fijo | Más simple, pero el condominio **absorbe la pérdida cambiaria y premia al que paga tarde** |

**Ninguna norma resuelve cuál usar. Es decisión de cada asamblea.** → **el módulo debe soportar ambos y hacerlo configurable por condominio.**

### 5.5 Reexpresión monetaria y ajuste por inflación

#### Ajuste Por Inflación fiscal (API)

**[LEY] · Confianza: Alta.** Está **parcialmente derogado**:
- Noviembre 2014: se excluye del API a bancos y aseguradoras.
- **Reforma de la Ley de ISLR, Gaceta Oficial N° 6.210 Extraordinario del 30 de diciembre de 2015** (art. 171 LISLR): se **excluye del sistema de ajuste por inflación a los contribuyentes calificados como sujetos pasivos especiales**. Sigue vigente.

<https://gerenciaytributos.blogspot.com/2016/01/reformada-la-ley-de-islr-publicada-en.html>

**[NO VERIFICADO] · ¿Aplica a condominios?** Razonamiento: un condominio no genera enriquecimiento gravable y no suele estar calificado como sujeto pasivo especial, por lo que en la práctica el API fiscal **no le aplica**. **No se localizó norma ni dictamen del SENIAT que lo diga expresamente. Verificar con contador venezolano antes de afirmarlo en producto.**

#### Reexpresión contable (VEN-NIF)

**[NORMA GREMIAL] · Confianza: Alta — BA VEN-NIF N° 2, Versión 4 (FCCPV, 2017)**, *"Criterios para el Reconocimiento de la Inflación en los Estados Financieros preparados de acuerdo con los VEN-NIF"*:
- Se reconoce el efecto de la inflación **cuando la inflación acumulada del ejercicio supera un (1) dígito** (> 9,99%).
- Entidades grandes → **NIC 29**; PYMES → **Sección 31 de NIIF para las PYMES**.
- **El índice obligatorio es el INPC del BCV.** Usar índices desagregados o de otra fuente **hace que los estados financieros NO estén conformes con VEN-NIF**.

<https://campusvirtual.fccpv.org/pluginfile.php/89034/mod_data/content/718/BA%20VEN-NIF%20N%202%20Version%204.pdf>

**[DATO OFICIAL] · Confianza: Alta — el problema del INPC:** el BCV **dejó de publicar el INPC desde octubre de 2023** y se puso al día recién en **marzo de 2026**:

| Período | INPC |
|---|---|
| 2024 (anomalía) | 47,96% |
| **2025 (cierre)** | **475,28%** |
| Enero 2026 | +32,6% |
| Febrero 2026 | +14,6% |
| Acumulado ene–feb 2026 | **51,94%** |
| **Anualizada a feb 2026** | **617,84%** — la más alta en 3 años |

<https://www.bancaynegocios.com/bcv-se-puso-al-dia-inflacion-acumulada-en-2026-se-ubica-en-51con94-porciento-y-2025-cerro-con-alza-de-475con28-porciento/> · <https://gerenciaytributos.blogspot.com/2026/03/bcv-publica-inpc-hasta-febrero-2026.html> · <https://www.bcv.org.ve/precios-consumidor/indice-nacional-de-precios-al-consumidor-inpc>

**[COSTUMBRE] · Confianza: Media — ¿Aplica a condominios?** Los condominios **NO emiten estados financieros bajo VEN-NIF**. Su obligación legal es la del art. 20 LPH: llevar contabilidad de ingresos y gastos con comprobantes y presentar informe anual. **Nadie audita un condominio bajo NIC 29.** En condominios, la reexpresión se usa como **herramienta de cobranza** (indexar la deuda morosa), no como norma de reporte.

**Implicación de diseño:** cualquier función de indexación debe **tolerar meses faltantes de INPC** (hubo un hueco de 29 meses). El propio BA VEN-NIF 2 v4 contempla estimar los meses sin información.

### 5.6 IGTF (Impuesto a las Grandes Transacciones Financieras)

**[LEY] · Confianza: Alta:**
- **Reforma de la Ley de IGTF — Gaceta Oficial N° 6.687 Extraordinario del 25 de febrero de 2022**, vigente desde el **28 de marzo de 2022**.
- **Alícuota vigente: 3%** sobre pagos en moneda extranjera o criptoactivos no emitidos por la República. La ley permite un rango de 2%–8% que fija el Ejecutivo.
- **Base imponible:** monto total de la operación, **IVA incluido**.
- **Agentes de percepción:** los **Sujetos Pasivos Especiales (SPE)** designados por el SENIAT. Declaran y enteran **quincenalmente y en bolívares**.
- **IGTF en bolívares = 0% desde julio 2024** (Decreto N° 4.972, G.O. N° 6.821 Extraordinario). **El 3% en divisas NO fue tocado y sigue vigente en 2026.**

<https://prodavinci.com/igtf-y-pagos-en-dolares-10-preguntas-y-respuestas/> · <https://accesoalajusticia.org/fijada-en-cero-por-ciento-0-la-alicuota-del-impuesto-a-las-grandes-transacciones-financieras-igtf/> · <https://www.pwc.com/ve/es/publicaciones/assets/PublicacionesNew/Boletines/Modificaci%C3%B3n%20de%20la%20Al%C3%ADcuota%20de%20IGTF%202%20al%200%20(Julio%202024).pdf> · <https://galac.com/galac-blog/igtf-pagos-divisas-cripto/>

#### ¿Aplica el IGTF a un condominio? Dos direcciones distintas

**1. Cuotas que el condominio COBRA en divisas — [OPINIÓN] · Confianza: Baja.**
El IGTF solo se percibe cuando **el receptor del pago es un SPE**. Un condominio no lucrativo normalmente **no está calificado como SPE**, por lo que no debería percibir el 3% sobre las cuotas cobradas en divisa.
**[NO VERIFICADO]** El único sitio que afirma que el SENIAT reconoció que un condominio no debe calificarse SPE es un blog de proveedor. **No se localizó providencia, dictamen ni gaceta que lo respalde.**

**2. Gastos que el condominio PAGA en divisas a proveedores SPE — [LEY] · Confianza: Alta.**
**Aquí sí hay IGTF real.** El proveedor (ascensores, seguridad, repuestos) le carga **3% adicional** al condominio. **Ese 3% es un costo del condominio que debe presupuestarse y aparecer como línea en la relación de gastos.** Este es el impacto contable más importante del IGTF para un condominio.

**[NO VERIFICADO — probablemente FALSO]** Un sitio afirma que existe una *"exención mensual de $200 USD antes de aplicar el IGTF"*. Se buscó específicamente y **no se encontró ningún decreto que la establezca. No usar ese dato.**

**[NO VERIFICADO] · IVA adicional por pagos en divisas:** la Ley del IVA (Decreto Constituyente, G.O. N° 6.507 Extraordinario del 29/01/2020) prevé en su **art. 62** una **alícuota adicional de IVA entre 5% y 25%** cuando se pague en divisas, que **solo entra en vigencia 30 días después de que el Ejecutivo publique el decreto que la fije**. Hay reportes de activación desde el 05/07/2025 pero **no se pudo confirmar el número de decreto ni la alícuota efectiva. Verificar antes de modelar esto.**

### 5.7 Práctica real de los condominios venezolanos

**[COSTUMBRE] · Confianza: Alta — el patrón dominante está bien documentado:**

> **Recibo bimoneda. Cuota expresada en USD como unidad de cuenta. Pago en bolívares a la tasa BCV del día del pago.**

**Por qué se dolarizó:** los **proveedores** (ascensores, hidroneumático, piscina, jardinería, vigilancia, conserjería, repuestos importados) **cotizan y facturan en dólares**. Si el ingreso es en Bs nominales y el gasto en USD, el condominio se descapitaliza entre la emisión del recibo y el pago al proveedor. **La dolarización de la cuota es calce de moneda, no ideología.**

**Evidencia periodística:**
- **Crónica Uno, 3 de marzo de 2019** — *"Condominios sobreviven a punta de cobros de cuotas en dólares"*: micondominio.com recibía **12 a 15 casos diarios** de juntas implementando cobro en divisa. Cuotas especiales típicas de **$10–15** para bombas de agua y ascensores. Elías Santana: *"Esto hace un año no estaba ocurriendo. Ahora tenemos una hiperinflación en bolívares y una inflación en dólares"*. El reportaje señala explícitamente el **vacío normativo**.
  <https://cronica.uno/condominios-sobreviven-a-punta-de-cobros-de-cuotas-en-dolares/>
- **Rafael Viso (experto en derecho condominial), 19/04/2021** — *"Conversión de bolívares a dólares en los condominios"*. Plantea las preguntas abiertas reales del gremio, **sin cerrarlas**: ¿qué tasa (BCV, paralela o Binance)? ¿el recibo muestra ambas monedas simultáneamente? **¿qué procedimiento cuando el pago llega días después con otra tasa?** Un comentarista insiste en que cualquier cambio de emisión requiere asamblea o carta consulta.
  <https://curadas.com/2021/04/19/conversion-bolivares-dolares-condominios-rafael-viso/>
- **Rafael Viso, 05/05/2021** — *"El recibo de gastos comunes de la junta de condominio en dólares"*: concluye que hay que anclarse a una moneda dura y **"cobrar en dólares dando el equivalente en bolívares"**. Genera controversia en comentarios por el art. 318 CRBV.
  <https://curadas.com/2021/05/05/el-recibo-de-gastos-comunes-de-la-junta-de-condominio-en-dolares/>

**Montos típicos reportados [COSTUMBRE] · Confianza: Baja (testimonios):** **$25 a $50 mensuales** por apartamento en edificios de clase media en Caracas (2021). Cuotas extraordinarias de $10–15 (2019).

### 5.8 Reconversiones monetarias (para datos históricos)

**[LEY] · Confianza: Media-Alta**

| # | Nombre | Gaceta | Vigencia | Factor | ISO |
|---|---|---|---|---|---|
| 1 | Bolívar fuerte | Decreto N° 5.229, G.O. N° 38.638 | **01/01/2008** | ÷ 1.000 (**3 ceros**) | VEB → **VEF** |
| 2 | Bolívar soberano | Decreto N° 3.554 *(ver nota)*, G.O. N° 41.446 | **20/08/2018** | ÷ 100.000 (**5 ceros**) | VEF → **VES** (928) |
| 3 | Bolívar digital | Decreto N° 4.553, G.O. N° 42.185 del 06/08/2021 | **01/10/2021** | ÷ 1.000.000 (**6 ceros**) | VES → **VED** |

**Total: 14 ceros eliminados desde 2007.**

**[NO VERIFICADO] · Dos discrepancias:**
1. El decreto de 2018 aparece como **N° 3.548** en algunas fuentes y **N° 3.554** en otras. Hubo un decreto previo (N° 3.332, marzo 2018) que planteaba quitar 3 ceros el 04/06/2018, sustituido después por 5 ceros y el 20/08. **Verificar en gaceta si es load-bearing.**
2. El código **VED** fue asignado, pero **muchos sistemas financieros siguen usando VES**. **Confirmar el estado actual en ISO 4217 antes de persistir códigos de moneda.**

<https://es.wikipedia.org/wiki/Bol%C3%ADvar_(moneda)> · <https://bcv.org.ve/system/files/publicaciones/bcvozecon_no.4_rm_web.pdf> · <https://efectococuyo.com/economia/publicada-gaceta-oficial-con-decreto-de-reconversion-monetaria/>

### 5.9 Advertencia sobre una fuente

**[ALERTA]** El blog `odoocondominio.com` (proveedor de software, ampliamente citado en este informe por su cobertura del tema) cita en su artículo sobre cobro en moneda extranjera tres sentencias muy específicas — *"Gutiérrez Parra, marzo 2025"*, *"SC Damiani Bustillos, noviembre 2025"* y *"TSJ 325039/2023"* — **que NO se pudieron verificar en fuentes primarias del TSJ ni en repositorios jurídicos.** El sitio muestra señales de contenido generado masivamente. **No citar esas sentencias sin verificarlas en historico.tsj.gob.ve.**

---

## 6. Estados y reportes que la junta / el administrador debe presentar

### 6.1 Lo único obligatorio por ley

**[LEY] · Confianza: Alta — Art. 20.h LPH:** *"Presentar el informe y cuenta anual de su gestión."* Una vez al año, ante la **Asamblea de Copropietarios**. La ley **no define el contenido ni el formato** de ese informe.

**[LEY] · Confianza: Alta — Art. 20.f LPH:** los **comprobantes** deben estar disponibles para examen de los propietarios *"durante días y horas fijadas con conocimiento de ellos"*.

### 6.2 Lo que se presenta en la práctica

**[COSTUMBRE] · Confianza: Media.** Paquete típico de rendición de cuentas:

**Mensual (a propietarios y Junta):**
- Relación de gastos del mes con soportes (facturas, comprobantes de pago)
- Recibo/planilla de liquidación por unidad
- Estado de cuenta bancario + **conciliación bancaria**
- Relación de morosidad
- Saldo de fondos (reserva, prestaciones)

**Anual (a la Asamblea):**
- **Estado de ingresos y egresos** del ejercicio ← el reporte central de la rendición
- **Balance general** (activo / pasivo / patrimonio)
- **Estado de resultados**
- **Flujo de caja**
- Relación de morosidad al cierre
- Saldo y movimientos del fondo de reserva
- **Ejecución presupuestaria** (presupuestado vs. real) — **[COSTUMBRE]**
- Informe de gestión narrativo

Fuentes: <https://odoocondominio.com/blog/condominios-venezuela-3/la-rendicion-de-cuentas-en-condominios-todo-lo-que-debes-saber-sobre-el-proceso-legal-90> (24/03/2026) · <https://allcondominium.blogspot.com/2014/10/la-rendicion-de-cuentas-en-el-condominio.html> · <https://odoocondominio.com/blog/condominios-venezuela-3/guia-de-contabilidad-para-condominios-en-venezuela-marco-legal-y-financiero-88> (24/03/2026)

### 6.3 El presupuesto anual: NO está regulado

**[LEY] · Confianza: Alta —** **La LPH de 1983 NO menciona presupuesto anual.** No hay obligación legal de elaborarlo, ni mayoría definida para aprobarlo, ni formato.

**[COSTUMBRE / OPINIÓN] · Confianza: Media.** El ciclo que se usa en la práctica:

1. **Formulación** por el administrador según necesidades de la comunidad
2. **Discusión y aprobación** por la Asamblea de Copropietarios (la mayoría requerida **la fija el documento de condominio**, no la ley)
3. **Ejecución** con supervisión de la Junta de Condominio (art. 18.e LPH da la base: "velar por el correcto manejo de los fondos")
4. **Evaluación** mediante informes periódicos de ejecución

Fuente: <https://odoocondominio.com/blog/condominios-venezuela-3/el-presupuesto-de-ingreso-y-gastos-condominios-en-venezuela-ley-de-propiedad-horizontal-79> (19/11/2025) — el propio artículo reconoce el vacío legal y propone aplicar por analogía principios de ONAPRE. **Eso es [OPINIÓN], no norma.**

**Consecuencia de diseño:** el presupuesto es una **funcionalidad opcional y configurable**, no un paso obligatorio del flujo. Muchos condominios venezolanos operan por **caja pura**: gastan el mes, suman las facturas y prorratean. Forzar un presupuesto antes de poder emitir recibos rompería el modelo mental de la mayoría de los usuarios.

### 6.4 Base contable: ¿efectivo o devengo?

**[OPINIÓN] · Confianza: Baja-Media.** Una fuente de proveedor recomienda **base de devengo** alineada con **VEN-NIF PYME**, reconociendo el ingreso **al emitir el recibo**, no al cobrarlo — a diferencia del método de caja que usan comunidades más pequeñas.
Fuente: Odoo Condominio, 24/03/2026 (citada arriba).

**Realidad de mercado — [COSTUMBRE] · Confianza: Media:** la práctica dominante en condominios venezolanos es **base de caja / prorrateo de gastos efectivamente incurridos en el mes**, como demuestra la fórmula del §2.3 (se suman las facturas del mes y se dividen).

**Implicación:** con morosidad del ~40%, devengar el ingreso al emitir el recibo genera una cuenta por cobrar enorme que **no** es dinero disponible. El módulo debe distinguir siempre y en todos los reportes: **facturado ≠ cobrado ≠ disponible en banco.**

---

## 7. Plan de cuentas

### 7.1 ¿Existe un plan de cuentas oficial en Venezuela?

**NO. Confianza: Alta.**

Se buscó específicamente y **no se localizó ningún plan de cuentas ni catálogo de cuentas oficial para condominios en Venezuela**, ni en la LPH, ni en la FCCPV, ni en ningún organismo público.

**[LEY] · Confianza: Alta —** En el texto completo de la LPH **no aparecen los términos "plan de cuentas" ni "catálogo de cuentas"**. La ley solo exige llevar contabilidad ordenada (art. 20.f) y el Libro Diario sellado (art. 20.g). **Toda la estructura de cuentas es discrecional.**

**[NO VERIFICADO] —** No se encontró ningún boletín, BA VEN-NIF ni pronunciamiento de la **Federación de Colegios de Contadores Públicos de Venezuela (FCCPV)** dedicado específicamente a propiedad horizontal. Esto no prueba que no exista; prueba que no es localizable por búsqueda web pública.

Marco gremial de aplicación general (no sectorial):
- **BA VEN-NIF-8** "Principios de Contabilidad Generalmente Aceptados en Venezuela" — <https://www.ccpdistritocapital.org.ve/uploads/boletines/dc53e94e32805d7e046f5d9a5b9455b951649e75.pdf>
- **BA VEN-NIF-2** — reexpresión por inflación (ver §5.5)

**[OPINIÓN] · Confianza: Baja —** Un proveedor sostiene que *"la aplicación de VEN-NIF PYME en propiedad horizontal no es una obligación legal directa, pero es la mejor práctica"*. Es una opinión razonable de vendor, **no una norma**.

### 7.2 ¿Existe en Latinoamérica? Comparativa regional

**Conclusión: ningún país investigado tiene un plan de cuentas obligatorio y sectorial para condominios.**

| País | Contabilidad obligatoria | Plan de cuentas oficial | Guía sectorial |
|---|---|---|---|
| **Venezuela** | Sí — LPH art. 20 | **NO** | Ninguna |
| **Colombia** | Sí — Ley 675/2001 art. 51.5 | **NO** | **DOT 15 del CTCP (2024) — explícitamente NO vinculante** |
| **Chile** | Sí — Ley 21.442 (rendición anual) | **NO** | Clasificación legal de *tipos de gasto* |
| **México** | Sí — Contabilidad Electrónica SAT | Código agrupador SAT (genérico, no sectorial) | NIF B-16 (no lucrativas) |
| **Perú** | Sí — Ley 27157 y reglamentos | **No encontrado** | Reglamentos internos modelo |
| **Argentina** | Sí — CCyC art. 2067 + Ley 941 CABA | **NO** | Contenido mínimo de la liquidación de expensas |

**Colombia es el caso más maduro y el más útil como referencia:**

- **[NORMA] Ley 675 de 2001, art. 51.5:** el administrador debe *"llevar bajo su dependencia y responsabilidad, la contabilidad del edificio o conjunto"*. <https://www.sic.gov.co/sites/default/files/normatividad/Ley_675_2001.pdf>
- **[NORMA] Ley 675 art. 35 — Fondo de imprevistos:** recargo **no inferior al 1%** sobre el presupuesto anual de gastos comunes. La asamblea puede suspender el cobro cuando alcance el **50%** del presupuesto ordinario anual. ← **Contraste notable: Colombia sí fija por ley un mínimo; Venezuela no.** <https://leyes.co/el_regimen_de_propiedad_horizontal/35.htm>
- **[VERIFICADO] Colombia tampoco tiene PUC propio:** *"las personas jurídicas legalmente constituidas como propiedades horizontales no cuentan con un Plan Único de Cuentas (PUC) propio"* — Gerencie.com, actualizado 10/08/2026. <https://www.gerencie.com/contabilidad-en-la-propiedad-horizontal.html>
- **[GUÍA NO VINCULANTE] DOT N.° 15 del Consejo Técnico de la Contaduría Pública (CTCP)**, *"Propiedades horizontales de uso residencial o mixto (Grupos 2 y 3)"*, aprobado 18/06/2024, publicado 20/06/2024. Textualmente: *"este documento no tiene carácter vinculante y simplemente constituye una guía"*. <https://www.ctcp.gov.co/noticias/2024/ctcp-presenta-la-actualizacion-del-documento-de-or> · <https://actualicese.com/ctcp-actualizo-documento-de-orientacion-tecnica-no-15-para-propiedades-horizontales/>
- **[MUY RELEVANTE PARA EL MODELO DE DATOS] CTCP Concepto 182 de 2024:** define que el **fondo de imprevistos NO es pasivo, ni patrimonio, ni gasto**, sino un **ACTIVO RESTRINGIDO** (efectivo de destinación específica). Los **rendimientos financieros del fondo sí son ingreso**. Cualquier otro fondo de destinación específica (obras, mantenimiento) recibe **el mismo tratamiento**. <https://www.ambitojuridico.com/noticias/contable/tributario-y-contable/ctcp-aclara-tratamiento-contable-del-fondo-de-imprevistos> · <https://www.ochgroup.co/wp-content/uploads/2025/04/2024-0075-Fondo-de-imprevistos-en-propiedad-horizontal-F.pdf>
- **[NO OFICIAL] PUCC — "Plan Único de Cuentas para Copropiedades"**: catálogo **privado**, no oficial, que circula libremente en Colombia. Estructura jerárquica de 6 dígitos (clase/grupo/cuenta/subcuenta), clases 1–9. **[NO VERIFICADO]** No se pudo extraer el listado completo de códigos, ni identificar quién lo emitió originalmente ni si tiene respaldo gremial. <https://idoc.pub/documents/puuc-propiedad-horizontal-ylyxkd952qnm>

**Otros hallazgos regionales relevantes para diseño:**
- **Chile — [NORMA] Ley 21.442 (13/04/2022):** clasifica legalmente los gastos en **ordinarios** (subdivididos en *administración, mantención, reparación, y uso o consumo*), **extraordinarios**, y **fondo común de reserva**. El fondo de reserva cubre gastos urgentes **e indemnizaciones por término de relaciones laborales del personal**. Obliga a **cuenta bancaria a nombre de la comunidad**. <https://www.leychile.cl/leychile/navegar?idNorma=1174663>
- **Argentina — [NORMA] Ley 941 CABA + Directiva DI-1146/DGDYPC/24:** obliga a **liquidación mensual de expensas** con detalle de ingresos y egresos del mes anterior y activo/pasivo total, y a incluir un **QR o link de acceso a la documentación respaldatoria**. ← Es exactamente el patrón "recibo con soportes enlazados" que un SaaS resuelve de forma nativa.
- **México:** cuotas de mantenimiento exentas de IVA/ISR bajo cumplimiento estricto; condominios bajo Título III LISR (no lucrativas).

### 7.3 Estructura típica que usan los administradores venezolanos

**[COSTUMBRE] · Confianza: Media.** Reconstruida a partir de: la estructura presupuestaria publicada por un proveedor, el artículo contable del Prof. Eduardo Fuenmayor Fernández, el análisis de "Básico de Contadores", y la definición legal de gastos comunes del art. 11 LPH.

#### Estructura por partidas presupuestarias (la convención más reconocible en Venezuela)

Codificación al estilo de presupuesto público (por analogía con ONAPRE):

**INGRESOS**

| Código | Partida | Contenido |
|---|---|---|
| 3.01 | Ingresos Ordinarios | Recaudos por alícuota (gastos comunes) |
| 3.02 | Ingresos Extraordinarios | Cuotas especiales aprobadas en Asamblea |
| 3.03 | Ingresos Propios / Patrimoniales | Alquiler de azotea, salón de fiestas, valla publicitaria |
| 3.04 | Fondo de Reserva / Imprevistos | % sobre el ingreso ordinario (típicamente 10%) |

**GASTOS**

| Código | Partida | Contenido |
|---|---|---|
| 4.01 | Gastos de Personal | Nómina conserje, vigilancia, prestaciones, IVSS |
| 4.02 | Servicios Básicos | Hidrocapital, Corpoelec, Aseo Urbano, Internet |
| 4.03 | Mantenimiento y Conservación | Ascensores, bombas, piscina, jardines |
| 4.04 | Gastos Administrativos | Honorarios administradora, software, papelería |
| 4.05 | Inversión y Mejoras | Pintura de fachada, impermeabilización |

Fuente: <https://odoocondominio.com/blog/condominios-venezuela-3/el-presupuesto-de-ingreso-y-gastos-condominios-en-venezuela-ley-de-propiedad-horizontal-79> (19/11/2025). **[OPINIÓN]** — es la propuesta de un proveedor, no una norma.

#### Cuentas concretas documentadas en la práctica venezolana

Fuente contable independiente: Prof. Eduardo Fuenmayor Fernández, *"La Administración de un Condominio, Parte III — La Contabilidad"*, 04/07/2011 — <https://elcondominiofeliz.blogspot.com/2011/07/la-administracion-de-un-condominio.html>

- **Activo:** Caja, Bancos, Cuentas por Cobrar; mobiliario de oficina, equipos, herramientas menores
- **Pasivo:** Sueldos por pagar, luz por pagar, agua por pagar, proveedores
- **Patrimonio:** *"Fondos (de Reserva, de Prestaciones, otros)"*
- **Ingresos:** Ingresos por Condominio, Ingresos por Alquiler de Salón de Fiesta, alquiler de apartamentos/locales
- **Egresos:** Sueldo del Conserje, Mantenimiento de Ascensores, Luz del edificio, Agua del edificio, Artículos de limpieza
- **Estados:** Balance General y Estado de Resultados

**Conceptos doctrinarios que conviene adoptar (coincidentes entre fuentes):**
- **Recaudo ≠ Ingreso lucrativo:** las cuotas son aportes para sufragar gastos comunes, no ventas.
- **Desembolso ≠ Costo de producción:** son usos de fondos comunes para conservación del inmueble.
- **Excedente no distribuible:** se destina al fondo de reserva; no se reparte entre propietarios (concuerda con LPH art. 20.d: los propietarios *por mayoría* deciden el destino del excedente).
- *"Cuentas por Cobrar es el protagonista contable de todo condominio"* — desde que se emite el recibo nace la CxC contra la unidad.

### 7.4 Plan de cuentas sugerido para Venezuela (síntesis propuesta)

> ⚠️ **Esto es una SÍNTESIS a partir de las fuentes anteriores, NO un estándar. No existe un estándar.** La codificación numérica es convención, no norma. Se incluye porque es lo que se pidió y porque sirve como catálogo semilla.

```
1. ACTIVO
  1.1 ACTIVO CIRCULANTE
    1.1.01 Caja / Caja chica
    1.1.02 Banco cuenta corriente (Bs.)
    1.1.03 Banco cuenta en divisas (USD)
    1.1.04 Cuentas por cobrar condominio — unidades (ordinarias)
    1.1.05 Cuentas por cobrar cuotas extraordinarias / derramas
    1.1.06 Cuentas por cobrar intereses de mora / multas
    1.1.07 Provisión para cuentas incobrables            (contra-activo)
    1.1.08 Anticipos a proveedores
    1.1.09 Fondo de reserva — efectivo restringido        ← ver nota abajo
    1.1.10 Fondo de prestaciones sociales — depósito/fideicomiso
    1.1.11 Inventario de materiales de limpieza y mantenimiento
  1.2 ACTIVO NO CIRCULANTE
    1.2.01 Mobiliario y equipos de oficina
    1.2.02 Equipos y herramientas de mantenimiento
    1.2.03 Mejoras a bienes comunes capitalizables
    1.2.04 Depreciación acumulada                         (contra-activo)

2. PASIVO
  2.1 PASIVO CIRCULANTE
    2.1.01 Cuentas por pagar proveedores
    2.1.02 Servicios por pagar (agua, electricidad, aseo)
    2.1.03 Sueldos y salarios por pagar
    2.1.04 Cesta ticket / bono de alimentación por pagar
    2.1.05 Retenciones por pagar (IVSS, FAOV, INCES, RPE)
    2.1.06 Honorarios por pagar (administración, contador, abogado)
    2.1.07 Anticipos de propietarios / cuotas cobradas por anticipado
    2.1.08 Fondos de terceros en custodia (depósitos de salón de fiestas)
  2.2 PASIVO LABORAL / PROVISIONES
    2.2.01 Prestaciones sociales por pagar
    2.2.02 Provisión de vacaciones y bono vacacional
    2.2.03 Provisión de utilidades / bonificación de fin de año
    2.2.04 Provisión de intereses sobre prestaciones

3. PATRIMONIO
    3.1.01 Fondo de reserva acumulado
    3.1.02 Fondo de imprevistos / contingencia
    3.1.03 Fondo para obras específicas (derramas)
    3.1.04 Excedente (déficit) de ejercicios anteriores
    3.1.05 Excedente (déficit) del ejercicio
    3.1.06 Resultado por exposición a la inflación (REI) / ajuste VEN-NIF

4. INGRESOS
    4.1.01 Cuotas ordinarias de condominio
    4.1.02 Cuotas extraordinarias / derramas
    4.1.03 Aporte a fondo de reserva
    4.1.04 Alquiler de áreas comunes (salón de fiestas, azotea, valla)
    4.1.05 Intereses de mora
    4.1.06 Multas por incumplimiento del reglamento
    4.1.07 Intereses bancarios / rendimientos
    4.1.08 Ingresos varios / recuperaciones

5. EGRESOS / GASTOS
  5.1 GASTOS DE PERSONAL
    5.1.01 Sueldo de conserjería
    5.1.02 Sueldo personal de mantenimiento / aseo
    5.1.03 Cesta ticket / bono de alimentación
    5.1.04 Prestaciones sociales
    5.1.05 Vacaciones y bono vacacional
    5.1.06 Utilidades / bonificación de fin de año
    5.1.07 IVSS (aporte patronal)
    5.1.08 FAOV
    5.1.09 INCES
    5.1.10 RPE / Régimen Prestacional de Empleo (paro forzoso)
    5.1.11 Uniformes y dotación
    5.1.12 Liquidaciones e indemnizaciones
  5.2 SERVICIOS BÁSICOS
    5.2.01 Agua (Hidrocapital / hidrológica regional)
    5.2.02 Electricidad áreas comunes (Corpoelec)
    5.2.03 Aseo urbano
    5.2.04 Gas
    5.2.05 Internet / telefonía / CCTV
  5.3 MANTENIMIENTO Y CONSERVACIÓN
    5.3.01 Mantenimiento de ascensores
    5.3.02 Mantenimiento de bombas de agua e hidroneumático
    5.3.03 Mantenimiento de planta eléctrica
    5.3.04 Mantenimiento de piscina
    5.3.05 Jardinería y áreas verdes
    5.3.06 Limpieza y artículos de limpieza
    5.3.07 Fumigación y control de plagas
    5.3.08 Mantenimiento de portones, cercas eléctricas y cerraduras
    5.3.09 Mantenimiento de tanques y cisternas
    5.3.10 Reparaciones menores (plomería, electricidad, herrería, pintura)
    5.3.11 Extintores y sistemas contra incendio
  5.4 SEGURIDAD
    5.4.01 Vigilancia contratada
    5.4.02 Monitoreo y sistemas de seguridad
  5.5 GASTOS ADMINISTRATIVOS
    5.5.01 Honorarios de administración
    5.5.02 Honorarios contables
    5.5.03 Honorarios legales / cobranza judicial
    5.5.04 Papelería, impresión de recibos y útiles de oficina
    5.5.05 Sellado de libros / gastos notariales y de registro
    5.5.06 Licencias de software de condominio
    5.5.07 Gastos bancarios y comisiones
    5.5.08 IGTF pagado a proveedores (3% en divisas)
    5.5.09 Seguros (responsabilidad civil, incendio)
  5.6 INVERSIÓN Y MEJORAS
    5.6.01 Pintura de fachada y áreas comunes
    5.6.02 Impermeabilización
    5.6.03 Obras y remodelaciones aprobadas en asamblea
  5.7 OTROS
    5.7.01 Cuentas incobrables
    5.7.02 Diferencial cambiario (ganancia / pérdida en cambio)
    5.7.03 Ajuste por inflación (INPC)
```

**Nota de diseño sobre el fondo de reserva — tensión real no resuelta:** las fuentes venezolanas lo ubican **indistintamente en activo** (efectivo restringido) **o en patrimonio** (fondo acumulado). El **CTCP colombiano (Concepto 182 de 2024)** zanjó que técnicamente es un **activo restringido**, no pasivo ni patrimonio. **Recomendación: modelar ambas caras** — la cuenta bancaria/saldo segregado (activo) y el fondo acumulado (patrimonio), que deben corresponderse. Así el reporte "¿cuánto hay en el fondo de reserva?" tiene una única respuesta verificable.

### 7.5 Nota sobre el conserje (régimen laboral especial)

**[LEY] · Confianza: Media —** El conserje en Venezuela está bajo un **régimen especial**: Título IV LOTTT + **Ley Especial para la Dignificación de Trabajadoras y Trabajadores Residenciales** (jornada limitada, prohibición de horas extra, plan de trabajo consensuado).
<https://www.mpppst.gob.ve/mpppstweb/wp-content/uploads/2014/03/LEY_ESPECIAL_PARA_LA_DIGNIFICACION_DE_TRABAJADORES_Y_TRABAJADORAS_RESIDENCIALES.pdf>

**[OPINIÓN] · Confianza: Media —** Errores al calcular el **salario integral** (especialmente incluir o excluir el bono de alimentación en la base de prestaciones) generan **pasivos laborales ocultos** que exponen a la comunidad a demandas. Es un punto donde un software puede aportar valor real, y también donde puede hacer daño real si calcula mal.

---

## 8. Síntesis: lo que más condiciona el diseño del módulo contable

### 8.1 Las 10 restricciones duras

1. **La deuda se pega a la UNIDAD, no a la persona** (art. 13 LPH, *propter rem*). El estado de cuenta es por unidad; el propietario es un atributo histórico. Cambiar de propietario **no** limpia el saldo.
2. **El recibo es un TÍTULO EJECUTIVO** (art. 14 LPH). Lo que emite el software tiene consecuencias procesales: exige numeración, inmutabilidad post-emisión, trazabilidad al comprobante, y anulación por nota de crédito (nunca borrado).
3. **La alícuota solo cambia por UNANIMIDAD** (art. 7 LPH). Dato casi inmutable; cualquier cambio debe quedar auditado con referencia al acta.
4. **La suma de alícuotas NO siempre da 100.** Dividir siempre entre la suma real y alertar cuando ≠ 100.
5. **Hay gastos comunes a TODOS y comunes a ALGUNOS** (arts. 11, 12, 22 LPH), más gastos individuales. Se necesitan **grupos de prorrateo**, no un prorrateo global único.
6. **Un solo libro obligatorio: el Libro Diario**, sellado por Notario o Juez (art. 20.g). Mayor e Inventarios son costumbre.
7. **Los comprobantes deben estar disponibles a los propietarios** (art. 20.f). Adjuntar soportes a cada gasto **es cumplimiento legal**, no una feature.
8. **Solo UNA rendición obligatoria al año**, ante la Asamblea (art. 20.h). Todo lo mensual es costumbre → no forzarlo.
9. **No hay presupuesto obligatorio.** Muchos condominios operan por caja pura. El presupuesto debe ser opcional.
10. **No hay plan de cuentas oficial en Venezuela ni en la región.** El catálogo debe ser **editable por condominio**, con uno sembrado por defecto.

### 8.2 Las 5 decisiones que hay que dejar configurables (porque la ley no las resuelve)

| Decisión | Opciones | Por qué es configurable |
|---|---|---|
| **Base de reparto de cuotas especiales** | Por alícuota / partes iguales / grupo | El art. 12 manda alícuota; el mercado usa ambas. Lo define el documento de condominio o el acta |
| **Tasa aplicada al pago tardío** | Tasa de emisión / tasa del día de pago | Ninguna norma lo resuelve. Es decisión de asamblea. Ver §5.4 |
| **Tasa de interés de mora** | 3% anual (default legal) / hasta 12% con acta | Art. 1.746 CC. El >3% **exige acta de asamblea** — el sistema debería pedir la referencia |
| **Fondo de reserva** | % de gastos / monto fijo / ninguno | No hay mínimo legal en Venezuela (a diferencia del 1% colombiano). El 10% es costumbre |
| **Moneda de cuenta** | Bs / USD / bimoneda | Legal como unidad de cuenta, pero el pago en Bs a tasa del día libera la deuda |

### 8.3 El modelo de datos multimoneda mínimo

Cada **recibo** y cada **pago** necesita al menos cuatro campos, no dos:

```
monto_usd     (moneda de cuenta)
tasa_bcv      (tasa aplicada)
fecha_tasa    (qué día es esa tasa)
monto_bs      (moneda de curso legal — lo que va al libro)
```

Y la diferencia entre la tasa del recibo y la tasa del pago es una **cuenta de resultado real** (diferencial cambiario). **Si el sistema no la modela, la conciliación bancaria nunca cuadra.**

### 8.4 Lo que NO se pudo verificar — leer antes de diseñar

Estos puntos **no deben convertirse en lógica de producto sin consulta a un contador/abogado venezolano**:

1. Si el **recibo de condominio** está sujeto a la **Providencia SNAT/2011/0071** de facturación (§2.1).
2. Si la **junta de condominio es agente de retención de ISLR** frente a sus proveedores (§4.2). **Zona de mayor riesgo del informe.**
3. La **letra inicial del RIF de comunidad** (§4.1).
4. Si el **art. 131 LOTTT (utilidades)** aplica a una entidad sin fines de lucro, o si aplica el **art. 132** (bonificación de fin de año de 30 días) (§4.3).
5. Si el **ajuste por inflación fiscal** aplica a condominios (§5.5).
6. Si existe **pronunciamiento del SENIAT** sobre que un condominio no califica como Sujeto Pasivo Especial (§5.6).
7. La **alícuota vigente y el decreto** del IVA adicional por pagos en divisas (§5.6).
8. La **sentencia TSJ SC N° 960 del 23/07/2015** sobre intereses en el título ejecutivo (§2.4).
9. El **número exacto del decreto de reconversión de 2018** y el estado ISO de **VED vs VES** (§5.8).
10. El **salario mínimo integral 2026 de USD 240** — la propia fuente dice *"pendiente publicación en Gaceta Oficial"* (§4.3). **Los parámetros salariales deben ser editables con fecha de vigencia, nunca hardcodeados.**

### 8.5 Fuentes que devolvieron 403 / anti-bot

No se pudo leer contenido completo (aparecen en resultados de búsqueda pero bloquean acceso automatizado): `naymaconsultores.com`, `galac.com`, `aslegabogados.com`, `comunicacioncontinua.com`, `tributos.ivecofi.net`, `tugacetaoficial.com`, `historico.tsj.gob.ve`, `soporte.condominiosvenezuela.com` (parcialmente sorteado vía curl). Si algún dato de esas fuentes resulta crítico, hay que abrirlas manualmente en navegador.

---

## Nota final

Este informe distingue deliberadamente entre lo que la ley obliga y lo que el mercado hace, porque **en Venezuela la brecha entre ambos es enorme**: la LPH tiene 43 años, no menciona fondos de reserva, ni presupuestos, ni multimoneda, ni morosidad más allá de la fuerza ejecutiva del recibo. Casi todo lo que un módulo contable moderno necesita hacer vive en el terreno de la costumbre y del documento de condominio de cada edificio.

**La consecuencia de producto es directa:** un módulo rígido que imponga "la forma correcta" va a chocar con la realidad de cada comunidad. Un módulo que trate las reglas (base de reparto, tasa aplicable, % de fondo, interés de mora) como **configuración respaldada por un acta**, y que guarde la trazabilidad de esa decisión, es el que puede defenderse tanto ante la asamblea como ante un tribunal.

