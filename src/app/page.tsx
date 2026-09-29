import Image from "next/image";
import Link from "next/link";
import { AtryumLogo } from "@/components/brand/atryum-logo";
import { CaraConserje } from "@/components/conserje/cara";
import { FAQAccordion } from "@/components/landing/faq-accordion";
import { ReciboVivo } from "@/components/landing/recibo-vivo";
import { Icono, type NombreIcono } from "@/components/ui/icono";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * atryum.net — la landing. Todo lo que dice está construido y en uso: si una
 * función no existe en la app, no aparece aquí.
 */
export const revalidate = 3600;

const PORTAL_LOGIN = process.env.NEXT_PUBLIC_PORTAL_URL ? `${process.env.NEXT_PUBLIC_PORTAL_URL}/login` : "/login";
const DEMO = "mailto:hola@atryum.net?subject=Quiero%20ver%20Atryum%20en%20mi%20condominio";

/** La tasa BCV más reciente registrada (la página se regenera cada hora). */
async function tasaDelDia(): Promise<{ tasa: number; fecha: string }> {
  try {
    const { data } = await createAdminClient()
      .from("exchange_rates")
      .select("rate, effective_date")
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      return {
        tasa: Number(data.rate),
        fecha: new Date(`${data.effective_date as string}T12:00:00Z`).toLocaleDateString("es-VE", {
          day: "numeric",
          month: "long",
          timeZone: "UTC",
        }),
      };
    }
  } catch {
    /* sin base: la página igual se muestra */
  }
  return { tasa: 0, fecha: "" };
}

const PASOS_DEL_MES: { titulo: string; texto: string; icono: NombreIcono }[] = [
  {
    titulo: "La junta emite",
    texto: "Las cuotas del mes por alícuota, la marina solo a quien tiene puesto, una derrama aprobada en asamblea. Cada recibo sale numerado, en dólares y con su equivalente en bolívares.",
    icono: "lapiz",
  },
  {
    titulo: "El vecino paga y lo reporta",
    texto: "Paga desde su banco como siempre y sube la captura con la referencia. Puede abonar una parte. El saldo a favor se aplica solo.",
    icono: "telefono",
  },
  {
    titulo: "La administración aprueba",
    texto: "Revisa el comprobante contra el banco y aprueba. El vecino recibe el aviso y su constancia; la cuota desaparece de su deuda.",
    icono: "check",
  },
  {
    titulo: "Las cuentas cuadran solas",
    texto: "Cada documento genera su asiento en el libro diario, en dólares y en bolívares. La relación de gastos para la asamblea sale lista para imprimir.",
    icono: "barras",
  },
];

const JUNTA: { grupo: string; items: { icono: NombreIcono; titulo: string; texto: string }[] }[] = [
  {
    grupo: "Cobranza",
    items: [
      { icono: "barras", titulo: "Cuentas por cobrar con antigüedad", texto: "Quién debe, cuánto y desde cuándo: por vencer, 30, 60, 90 y más de 90 días. Se exporta a Excel." },
      { icono: "reloj", titulo: "Recordatorios que salen solos", texto: "Tres días antes del vencimiento y al día siguiente. Para los morosos, un botón abre WhatsApp con el mensaje escrito." },
      { icono: "voto", titulo: "Convenios de pago", texto: "La deuda vencida en cuotas mensuales. Mientras el vecino cumpla, figura al día y puede reservar." },
      { icono: "dinero", titulo: "Intereses de mora", texto: "Tasa anual del condominio, por días de atraso y sin interés sobre intereses. Se revisa unidad por unidad antes de emitir." },
    ],
  },
  {
    grupo: "Contabilidad",
    items: [
      { icono: "candado", titulo: "Recibos que no se pueden alterar", texto: "Número correlativo y sin edición posible. Un error se corrige con una nota de crédito, como pide el artículo 14 de la Ley de Propiedad Horizontal." },
      { icono: "base", titulo: "Libro diario, mayor y balance", texto: "Salen de los documentos, siempre cuadrados, con el diferencial cambiario entre la tasa de emisión y la de cobro." },
      { icono: "etiqueta", titulo: "Gastos con su soporte", texto: "Cada gasto con categoría, proveedor y factura. Presupuesto anual contra lo ejecutado, a la vista de todos." },
      { icono: "familia", titulo: "Gastos de algunos, no de todos", texto: "Grupos de prorrateo para la marina o un estacionamiento techado: el total se reparte solo entre quienes corresponde." },
    ],
  },
  {
    grupo: "Día a día",
    items: [
      { icono: "sobre", titulo: "Comunicados y avisos", texto: "Lo urgente llega también al correo. Cada vecino tiene su campana con lo que le concierne." },
      { icono: "herramienta", titulo: "Averías con seguimiento", texto: "El vecino reporta con foto; la administración cambia el estado y el vecino se entera sin preguntar." },
      { icono: "edificio", titulo: "Reservas con reglas", texto: "Capacidad, anticipación y límite por semana en cada área. Con cuotas vencidas, la app lo explica con tacto y no confirma la reserva." },
      { icono: "persona", titulo: "Propietarios e inquilinos", texto: "Se cargan desde la planilla de Excel de la junta. El propietario decide qué puede ver y hacer su inquilino." },
    ],
  },
];

const FAQS = [
  {
    q: "¿Los vecinos tienen que instalar algo?",
    a: "No. Atryum funciona en el navegador del teléfono o de la computadora. Entran con su correo y un código de seis dígitos que les llega; no tienen que inventar una contraseña.",
  },
  {
    q: "¿La app cobra o mueve dinero?",
    a: "No. Cada vecino paga desde su banco como siempre (transferencia, pago móvil, Zelle) y reporta el pago con su captura. La administración lo verifica y lo aprueba. Atryum lleva la cuenta; el dinero va directo al condominio.",
  },
  {
    q: "¿Cómo maneja los dólares y los bolívares?",
    a: "Las cuotas se emiten en dólares con su equivalente en bolívares a la tasa BCV del día. Cada pago guarda la tasa con la que se hizo, y el libro registra la diferencia cambiaria.",
  },
  {
    q: "¿Qué pasa con la deuda que ya existe?",
    a: "Se carga como saldo de apertura desde la planilla de cuentas por cobrar de la junta: lo que cada unidad debía, o tenía a favor, el día que empiezan.",
  },
  {
    q: "¿Mis vecinos pueden ver cuánto debo?",
    a: "No. Cada propietario ve solo lo suyo. La administración ve todo el condominio. Atri, el conserje, solo responde sobre las unidades de quien le pregunta.",
  },
  {
    q: "¿Los recibos tienen validez?",
    a: "Cada recibo lleva número correlativo, no se puede editar ni borrar y se anula con nota de crédito. Hay libro diario, estado de cuenta por unidad y relación de gastos para la asamblea, todo listo para imprimir o guardar en PDF.",
  },
  {
    q: "¿Y si decidimos irnos?",
    a: "Las cuentas por cobrar, el libro diario y las planillas se descargan en Excel en cualquier momento. No hay contrato de permanencia.",
  },
];

export default async function HomePage() {
  const { tasa, fecha } = await tasaDelDia();

  return (
    <div className="min-h-screen overflow-x-hidden bg-frost text-marine-deep">
      {/* Franja de la tasa: lo primero que mira cualquier venezolano. */}
      {tasa > 0 && (
        <div className="bg-marine-deep text-frost">
          <p className="mx-auto max-w-6xl px-5 py-1.5 text-[12.5px] md:px-8">
            <span className="text-frost/60">Tasa BCV del {fecha}:</span>{" "}
            <span className="font-mono tabular-nums text-cyan">Bs {tasa.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="hidden text-frost/60 sm:inline"> · Atryum la aplica a cada cuota y a cada pago.</span>
          </p>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-marine-deep/10 bg-frost/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-8" aria-label="Principal">
          <Link href="/" aria-label="Atryum, inicio">
            <AtryumLogo variant="horizontal" tone="color" className="text-[22px]" />
          </Link>
          <div className="hidden items-center gap-6 text-[14px] text-marine-deep/75 md:flex">
            <a href="#mes" className="hover:text-marine-deep">Cómo funciona</a>
            <a href="#junta" className="hover:text-marine-deep">Para la junta</a>
            <a href="#vecino" className="hover:text-marine-deep">Para el vecino</a>
            <a href="#precio" className="hover:text-marine-deep">Precio</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href={PORTAL_LOGIN} className="rounded-lg px-3 py-2 text-[14px] font-medium text-marine-deep hover:bg-marine-deep/5">
              Entrar
            </Link>
            <a href={DEMO} className="hidden rounded-lg bg-marine-deep px-4 py-2 text-[14px] font-medium text-frost hover:bg-marine sm:inline-block">
              Pedir una demostración
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Portada ─────────────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-16 md:grid-cols-[1.05fr_1fr] md:px-8 md:pt-24">
          <div>
            <h1 className="font-display text-[clamp(2.4rem,5.2vw,4.1rem)] font-bold leading-[1.02] tracking-[-0.04em] text-balance">
              Cuotas claras, pagos comprobados y cuentas que cuadran.
            </h1>
            <p className="mt-6 max-w-[34rem] text-[18px] leading-[1.6] text-marine-deep/75">
              Atryum es la administración del condominio en una sola app. La junta emite y cobra en dólares y bolívares, cada vecino
              ve lo suyo desde el teléfono y el libro contable se lleva solo.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={DEMO} className="rounded-xl bg-ember px-6 py-3.5 text-[15px] font-semibold text-marine-deep shadow-[0_14px_36px_-14px_rgb(232_115_44/0.7)] hover:brightness-105">
                Pedir una demostración
              </a>
              <a href="#mes" className="rounded-xl px-5 py-3.5 text-[15px] font-medium text-marine-deep ring-1 ring-marine-deep/20 hover:bg-marine-deep/5">
                Ver cómo funciona
              </a>
            </div>
            <p className="mt-6 text-[13.5px] text-mute">Con su primer condominio piloto en Lechería, Anzoátegui. Sin instalar nada: funciona en el navegador.</p>
          </div>
          <ReciboVivo tasa={tasa || 857.89} fechaTasa={fecha || "día"} />
        </section>

        {/* ── Un mes en el condominio ─────────────────────────────────── */}
        <section id="mes" className="border-y border-marine-deep/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-24 md:px-8">
            <h2 className="max-w-2xl font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
              Un mes en el condominio, sin perseguir a nadie por WhatsApp
            </h2>
            <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-marine-deep/70">
              El recorrido de cada cuota, de la emisión al libro. Cada paso deja rastro y nadie tiene que reconstruir nada en Excel.
            </p>
            <ol className="mt-14 grid gap-10 md:grid-cols-4 md:gap-8">
              {PASOS_DEL_MES.map((p, i) => (
                <li key={p.titulo} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-marine-deep font-display text-[15px] font-bold text-frost">
                      {i + 1}
                    </span>
                    {i < PASOS_DEL_MES.length - 1 && <span className="hidden h-px flex-1 bg-marine-deep/15 md:block" aria-hidden="true" />}
                  </div>
                  <h3 className="mt-5 flex items-center gap-2 font-display text-[19px] font-semibold tracking-[-0.01em]">
                    <Icono nombre={p.icono} className="h-5 w-5 text-cyan-ink" />
                    {p.titulo}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-marine-deep/70">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Atri ─────────────────────────────────────────────────────── */}
        <section className="bg-marine-deep text-frost">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 md:grid-cols-[0.9fr_1.1fr] md:px-8">
            <div>
              <CaraConserje tam={96} />
              <h2 className="mt-6 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
                Atri, el conserje que responde a cualquier hora
              </h2>
              <p className="mt-4 max-w-md text-[17px] leading-relaxed text-frost/75">
                Está en todas las pantallas. Contesta con los datos del condominio lo que antes era un mensaje a la administración, y si
                algo se dañó, deja el reporte listo para confirmar.
              </p>
              <p className="mt-4 max-w-md text-[14px] text-frost/55">
                Solo habla de las unidades de quien le pregunta: nunca de la deuda de otro vecino.
              </p>
            </div>
            <div className="space-y-3 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 sm:p-6" aria-label="Ejemplo de conversación con Atri">
              <Burbuja de="vecino">¿Cuánto debo?</Burbuja>
              <Burbuja de="atri">
                Tienes 2 cuotas por pagar: $230,51 (Bs 197.751,67 a la tasa BCV de hoy). La de agosto ya está vencida.
              </Burbuja>
              <Burbuja de="vecino">¿Está libre el caney el sábado?</Burbuja>
              <Burbuja de="atri">El caney el sábado está ocupado de 2:00 PM a 7:00 PM. El resto del día está libre.</Burbuja>
              <Burbuja de="vecino">Hay una fuga en el pasillo del piso 5</Burbuja>
              <Burbuja de="atri">
                Lo reporto por ti a la administración. Revisa el formulario de abajo, agrega una foto si puedes y toca «Enviar reporte».
              </Burbuja>
            </div>
          </div>
        </section>

        {/* ── Para la junta ───────────────────────────────────────────── */}
        <section id="junta" className="mx-auto max-w-6xl px-5 py-24 md:px-8">
          <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
            <div>
              <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
                Para la junta y la administración
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-marine-deep/70">
                Lo que hoy vive entre un Excel, una libreta y el grupo de WhatsApp, en un solo lugar y con respaldo.
              </p>
              <div className="relative mt-8 hidden aspect-[4/5] overflow-hidden rounded-2xl md:block">
                <Image src="/landing/torres-ciudad.webp" alt="Torres residenciales al atardecer" fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover" />
              </div>
            </div>
            <div className="space-y-12">
              {JUNTA.map((g) => (
                <div key={g.grupo}>
                  <h3 className="border-b border-marine-deep/15 pb-2 font-display text-[15px] font-semibold text-cyan-ink">{g.grupo}</h3>
                  <dl className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                    {g.items.map((it) => (
                      <div key={it.titulo} className="flex gap-3.5">
                        <Icono nombre={it.icono} className="mt-0.5 h-5 w-5 shrink-0 text-marine" />
                        <div>
                          <dt className="text-[15.5px] font-semibold">{it.titulo}</dt>
                          <dd className="mt-1 text-[14.5px] leading-relaxed text-marine-deep/70">{it.texto}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Para el vecino ──────────────────────────────────────────── */}
        <section id="vecino" className="border-y border-marine-deep/10 bg-white">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 md:grid-cols-2 md:px-8">
            <Telefono />
            <div>
              <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
                Para el vecino: abrir, ver cuánto debe y pagar
              </h2>
              <ul className="mt-8 space-y-5">
                {[
                  ["dinero", "Su saldo al día, en dólares y en bolívares a la tasa de hoy, con los datos bancarios del condominio a un toque."],
                  ["clip", "Reporta el pago con la captura. Recibe el aviso cuando lo aprueban y descarga su constancia o su estado de cuenta."],
                  ["auto", "Pases QR para sus visitas, que manda por WhatsApp. La garita le avisa cuando llegan."],
                  ["paquete", "Un aviso cuando le dejan un paquete en la garita, y otro cuando alguien lo retira."],
                  ["edificio", "Reserva la parrillera, el caney o la piscina viendo la disponibilidad de la semana."],
                ].map(([icono, texto]) => (
                  <li key={texto} className="flex gap-3.5 text-[16px] leading-relaxed text-marine-deep/80">
                    <Icono nombre={icono as NombreIcono} className="mt-1 h-5 w-5 shrink-0 text-ember-ink" />
                    {texto}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Garita ──────────────────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden bg-marine-deep text-frost">
          <Image src="/landing/garita-noche.webp" alt="" fill sizes="100vw" className="-z-10 object-cover object-right opacity-80" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-marine-deep from-35% via-marine-deep/80 to-marine-deep/10" aria-hidden="true" />
          <div className="mx-auto max-w-6xl px-5 py-24 md:px-8">
            <div className="max-w-xl">
              <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
                La garita, sin libreta
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-frost/75">
                El teléfono o la tablet de la vigilancia se vincula una sola vez. El vigilante no necesita cuenta ni ve nada de cuotas.
              </p>
              <ul className="mt-8 space-y-4 text-[15.5px] text-frost/85">
                <li className="flex gap-3"><Icono nombre="check" className="mt-0.5 h-5 w-5 shrink-0 text-cyan" />Escanea el QR de la visita y registra la entrada; un pase vencido o ya usado no pasa.</li>
                <li className="flex gap-3"><Icono nombre="check" className="mt-0.5 h-5 w-5 shrink-0 text-cyan" />Ve las visitas esperadas del día y busca por nombre, cédula, placa o apartamento.</li>
                <li className="flex gap-3"><Icono nombre="check" className="mt-0.5 h-5 w-5 shrink-0 text-cyan" />Recibe y entrega paquetes, y queda anotado quién los retiró.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Quién ve qué ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
          <h2 className="max-w-2xl font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
            Cada quien ve lo que le toca
          </h2>
          <div className="mt-10 overflow-x-auto rounded-2xl ring-1 ring-marine-deep/10">
            <table className="w-full min-w-[40rem] bg-white text-left text-[14.5px]">
              <thead className="bg-frost text-[13px] text-mute">
                <tr>
                  <th className="px-5 py-3 font-medium">Quién</th>
                  <th className="px-5 py-3 font-medium">Ve</th>
                  <th className="px-5 py-3 font-medium">Puede</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-marine-deep/10">
                {[
                  ["Propietario", "Sus cuotas, sus pagos, los gastos del condominio y los comunicados", "Pagar, reservar, invitar visitas, reportar averías, votar y dar permisos a su inquilino"],
                  ["Inquilino", "Lo que el propietario le permita", "Lo mismo que el propietario, dentro de esos permisos"],
                  ["Administración", "Todo el condominio", "Emitir, aprobar, anular con nota de crédito, registrar gastos, llevar el libro"],
                  ["Garita", "Visitas del día y paquetes", "Registrar entradas y entregas; nada de dinero"],
                ].map(([q, v, p]) => (
                  <tr key={q}>
                    <th scope="row" className="px-5 py-4 align-top font-semibold">{q}</th>
                    <td className="px-5 py-4 align-top text-marine-deep/75">{v}</td>
                    <td className="px-5 py-4 align-top text-marine-deep/75">{p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Precio ──────────────────────────────────────────────────── */}
        <section id="precio" className="border-y border-marine-deep/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-24 md:px-8">
            <h2 className="max-w-2xl font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
              Precio por unidad, no por persona
            </h2>
            <p className="mt-4 max-w-2xl text-[17px] text-marine-deep/70">
              Un apartamento con propietario e inquilino cuenta como una unidad. Sin contrato de permanencia.
            </p>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <Plan
                nombre="Inicial"
                precio="Gratis"
                nota="Hasta 15 unidades"
                items={["Cuotas por alícuota y pagos con comprobante", "Comunicados, averías y reservas", "Pases QR para visitas", "Atri, el conserje"]}
              />
              <Plan
                destacado
                nombre="Condominio"
                precio="$2"
                sufijo="por unidad al mes"
                nota="Todo lo de la app"
                items={[
                  "Recibos numerados, notas de crédito y abonos",
                  "Cuentas por cobrar, convenios e intereses",
                  "Libro diario, mayor y relación de gastos",
                  "Garita con visitas y paquetes",
                  "Presupuesto, grupos de prorrateo y asambleas",
                ]}
              />
              <Plan
                nombre="Administradoras"
                precio="$3"
                sufijo="por unidad al mes"
                nota="Varios condominios"
                items={["Todo lo del plan Condominio", "Varios condominios en una cuenta", "Logo de cada condominio en su app", "Acompañamiento para la puesta en marcha"]}
              />
            </div>
          </div>
        </section>

        {/* ── Preguntas ───────────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-5 py-24 md:px-8">
          <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em]">
            Lo que la junta siempre pregunta
          </h2>
          <div className="mt-10">
            <FAQAccordion items={FAQS} />
          </div>
        </section>

        {/* ── Cierre ──────────────────────────────────────────────────── */}
        <section className="bg-marine-deep text-frost">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-20 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="max-w-xl">
              <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.03em]">
                Veamos tu condominio en Atryum
              </h2>
              <p className="mt-3 text-[17px] text-frost/70">
                Te mostramos la app con una demostración y te ayudamos a cargar las unidades, las alícuotas y la deuda que ya existe.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={DEMO} className="rounded-xl bg-ember px-6 py-3.5 text-[15px] font-semibold text-marine-deep hover:brightness-105">
                Pedir una demostración
              </a>
              <Link href="/guias/administracion" className="rounded-xl px-5 py-3.5 text-[15px] font-medium text-frost ring-1 ring-frost/25 hover:bg-white/5">
                Leer la guía de la junta
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-marine-deep/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-[14px] text-mute md:flex-row md:items-center md:justify-between md:px-8">
          <AtryumLogo variant="horizontal" tone="color" className="text-[18px]" />
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Guías">
            <Link href="/guias/propietario" className="hover:text-marine-deep">Guía del propietario</Link>
            <Link href="/guias/administracion" className="hover:text-marine-deep">Guía de la administración</Link>
            <a href="mailto:hola@atryum.net" className="hover:text-marine-deep">hola@atryum.net</a>
          </nav>
          <p>
            Hecho por{" "}
            <a href="https://tuwebgo.net" target="_blank" rel="noopener noreferrer" className="text-marine hover:underline">
              TuWebGo
            </a>
          </p>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Atryum",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "Administración de condominios en Venezuela: cuotas en dólares y bolívares a la tasa BCV, recibos numerados, cuentas por cobrar, libro diario, garita con visitas y paquetes, y un conserje virtual.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Gratis hasta 15 unidades" },
            creator: { "@type": "Organization", name: "Atryum", url: "https://atryum.net" },
          }),
        }}
      />
    </div>
  );
}

function Burbuja({ de, children }: { de: "vecino" | "atri"; children: React.ReactNode }) {
  if (de === "vecino") {
    return (
      <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-ember px-4 py-2.5 text-[14.5px] font-medium text-marine-deep">
        {children}
      </p>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <CaraConserje tam={28} animada={false} className="shrink-0" />
      <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-[14.5px] leading-relaxed text-marine-deep">{children}</p>
    </div>
  );
}

/** La pantalla de inicio del vecino, dibujada con los estilos de la app. */
function Telefono() {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[2.6rem] bg-marine-deep p-2.5 shadow-[0_40px_80px_-30px_rgb(15_46_90/0.55)]" aria-hidden="true">
      <div className="overflow-hidden rounded-[2.1rem] bg-frost">
        <div className="flex items-center justify-between bg-marine-deep px-5 pb-1.5 pt-3 text-[10px] text-frost/70">
          <span>7:44 AM</span>
          <span className="font-mono text-cyan">BCV 857,89</span>
        </div>
        <div className="flex items-center gap-2 border-b border-marine-deep/10 bg-white px-4 py-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-marine-deep text-[11px] font-bold text-frost">EM</span>
          <span className="font-display text-[13px] font-semibold">Residencias El Mirador</span>
        </div>
        <div className="space-y-3 px-4 py-4">
          <p className="text-[11px] text-mute">Buenos días</p>
          <p className="-mt-2 font-display text-[22px] font-bold tracking-[-0.03em]">María</p>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-marine-deep/10">
            <p className="text-[10.5px] text-mute">Saldo pendiente</p>
            <p className="mt-1 font-display text-[26px] font-bold leading-none tracking-[-0.03em]">$230,51</p>
            <p className="mt-1.5 text-[10.5px] text-ember-ink">Cuota de agosto vencida hace 29 días</p>
            <p className="text-[10.5px] text-mute">Bs 197.751,67 · tasa 857,89</p>
            <span className="mt-3 block rounded-lg bg-marine py-2 text-center text-[12px] font-semibold text-frost">Pagar 2 cuotas</span>
          </div>
          <div className="rounded-2xl bg-white p-3.5 ring-1 ring-marine-deep/10">
            <p className="text-[11px] font-semibold">Tienes un paquete en la garita</p>
            <p className="text-[10.5px] text-mute">Caja mediana · MRW · llegó hoy 11:20 AM</p>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl bg-white p-3 ring-1 ring-marine-deep/10">
            <CaraConserje tam={30} animada={false} />
            <p className="text-[10.5px] leading-snug text-marine-deep/80">Pregúntale a Atri lo que necesites, o cuéntale si algo se dañó.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Plan({
  nombre,
  precio,
  sufijo,
  nota,
  items,
  destacado = false,
}: {
  nombre: string;
  precio: string;
  sufijo?: string;
  nota: string;
  items: string[];
  destacado?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-2xl p-7 ${destacado ? "bg-marine-deep text-frost" : "bg-frost ring-1 ring-marine-deep/10"}`}>
      <p className={`font-display text-[18px] font-semibold ${destacado ? "text-ember" : ""}`}>{nombre}</p>
      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-[40px] font-bold leading-none tracking-[-0.03em]">{precio}</span>
        {sufijo && <span className={`text-[14px] ${destacado ? "text-frost/65" : "text-mute"}`}>{sufijo}</span>}
      </p>
      <p className={`mt-2 text-[14px] ${destacado ? "text-frost/65" : "text-mute"}`}>{nota}</p>
      <ul className={`mt-6 flex-1 space-y-3 border-t pt-6 text-[14.5px] ${destacado ? "border-white/10 text-frost/85" : "border-marine-deep/10 text-marine-deep/80"}`}>
        {items.map((i) => (
          <li key={i} className="flex gap-2.5">
            <Icono nombre="check" className={`mt-0.5 h-4 w-4 shrink-0 ${destacado ? "text-ember" : "text-cyan-ink"}`} />
            {i}
          </li>
        ))}
      </ul>
      <a
        href={DEMO}
        className={`mt-7 rounded-xl py-3 text-center text-[14px] font-semibold ${
          destacado ? "bg-ember text-marine-deep hover:brightness-105" : "text-marine-deep ring-1 ring-marine-deep/20 hover:bg-marine-deep/5"
        }`}
      >
        {precio === "Gratis" ? "Empezar" : "Pedir una demostración"}
      </a>
    </div>
  );
}
