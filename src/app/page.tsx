import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { AtryumLogo, AtryumSymbol } from "@/components/brand/atryum-logo";
import { Magnetic } from "@/components/ui/magnetic";
import { TiltCard } from "@/components/ui/tilt-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { WowStack, type WowItem } from "@/components/landing/wow-stack";
import { AudienceTabs } from "@/components/landing/audience-tabs";
import { FAQAccordion } from "@/components/landing/faq-accordion";
import {
  CobranzaVisual,
  IdentityVisual,
  QrVisual,
  DecisionVisual,
  BudgetVisual,
  StepsVisual,
} from "@/components/landing/wow-visuals";

const PORTAL_LOGIN = process.env.NEXT_PUBLIC_PORTAL_URL
  ? `${process.env.NEXT_PUBLIC_PORTAL_URL}/login`
  : "/login";

const wowItems: WowItem[] = [
  {
    number: "01",
    pill: "COBRANZA POR ALÍCUOTA",
    title: (
      <>
        Cada quien paga lo justo, no lo{" "}
        <em className="font-editorial text-cyan">igualado</em>.
      </>
    ),
    copy: "Vos definís el modo: plano, por alícuota, por tipo de unidad o manual. Tu residente sube un comprobante para pagar 3 facturas a la vez. Aparece el badge EN REVISIÓN, vos aprobás. Cero persecución por WhatsApp.",
    bullets: [
      "Por alícuota, plano, por tipo o manual — vos eligís",
      "Un comprobante para múltiples cuotas + derrama",
      "Cuentas bancarias del condo siempre visibles al residente",
      "Badge EN REVISIÓN para evitar dobles pagos",
    ],
    visual: <CobranzaVisual />,
  },
  {
    number: "02",
    pill: "TU UNIDAD DE UN VISTAZO",
    title: (
      <>
        Abrís la app y entendés tu condominio en{" "}
        <em className="font-editorial text-cyan">3 segundos</em>.
      </>
    ),
    copy: "El residente entra y ve: su apto, qué debe, su próxima reserva, los anuncios urgentes y un botón flotante para pagar. Sin menúes, sin tutorial. Funciona también para inquilinos con permisos restringidos.",
    bullets: [
      "Identity strip: APTO · BLOQUE · CONDO · PROPIETARIO",
      "Banner urgente solo cuando aplica a tu audiencia",
      "FAB de pago si tenés saldo pendiente",
      "Soporte multi-unidad (varias propiedades, un solo login)",
    ],
    visual: <IdentityVisual />,
  },
  {
    number: "03",
    pill: "VISITANTES CON QR + WHATSAPP",
    title: (
      <>
        Tu visita entra con un{" "}
        <em className="font-editorial text-cyan">mensaje</em>, no con una llamada.
      </>
    ),
    copy: "Elegís el tipo (familia, Uber, delivery, mudanza, servicio). Atryum genera el QR, le mandás el link por WhatsApp. El vigilante escanea desde cualquier dispositivo. Si la placa o el tipo no coincide, lo ve.",
    bullets: [
      "7 tipos de visita con duración inteligente por defecto",
      "Compartir por WhatsApp con un toque",
      "Verificación pública: /verificar/[código]",
      "Placa de vehículo + nombre + cédula",
    ],
    visual: <QrVisual />,
  },
  {
    number: "04",
    pill: "DECISIONES CON VOTO PONDERADO",
    title: (
      <>
        Tu voto pesa lo que <em className="font-editorial text-ember">vale</em> tu apto.
      </>
    ),
    copy: "Encuestas rápidas o asambleas formales con quórum dinámico. El voto ponderado por alícuota es legalmente vinculante en la mayoría de Latam. Tenants votan si el reglamento lo permite. Resultados en vivo, acta automática.",
    bullets: [
      "Encuesta rápida (1 pregunta) · Asamblea formal (N preguntas)",
      "Voto ponderado por alícuota · 1 voter cuenta una sola vez",
      "Quórum dinámico computado en tiempo real",
      "IDs estables · links #decision-XYZ funcionan en histórico",
    ],
    killer: true,
    visual: <DecisionVisual />,
  },
  {
    number: "05",
    pill: "PRESUPUESTO QUE TODOS VEN",
    title: (
      <>
        Tu asamblea aprueba con datos,{" "}
        <em className="font-editorial text-cyan">no con grito</em>.
      </>
    ),
    copy: "Definís presupuesto anual por categoría con override mensual. Cada gasto tiene categoría normalizada, proveedor opcional y se puede anular con razón obligatoria. Las barras ejecutado/aprobado se ven en cyan, ámbar o rojo según uso.",
    bullets: [
      "13 categorías default + custom por condo",
      "Override mensual por categoría (mes alto, mes bajo)",
      "Anular gasto con razón ≥ 10 chars · histórico inmutable",
      "Vista compartida residente/admin · cero opacidad",
    ],
    visual: <BudgetVisual />,
  },
];

const faqs = [
  {
    q: "¿Cuánto tarda el setup?",
    a: "10 minutos. Creás el condominio, importás unidades por CSV o las agregás manuales, invitás a residentes por email o código físico. Ellos completan su registro solos.",
  },
  {
    q: "¿Qué pasa si decidimos irnos?",
    a: "Exportás todos tus datos en CSV (cuotas, gastos, residentes, decisiones). Sin contrato, sin penalidad, cancelás cuando quieras desde la configuración del condominio.",
  },
  {
    q: "¿Funciona si no tengo internet en la entrada?",
    a: "Sí. El vigilante escanea el QR offline desde su celular. Cuando vuelve la conexión, sincroniza el log. Los pases ya generados son válidos sin red.",
  },
  {
    q: "¿Los residentes necesitan instalar algo?",
    a: "No. Atryum es una web app. Funciona en cualquier celular o computadora con navegador. Se puede agregar al inicio del celular como app nativa (PWA).",
  },
  {
    q: "¿Quién ve los datos financieros?",
    a: "Vos como junta controlás. Por defecto residentes ven sus propias cuotas y el presupuesto aprobado. Inquilinos pueden tener permisos restringidos. Admins ven todo.",
  },
  {
    q: "¿Hay costos por residente?",
    a: "No. El precio es por unidad/mes (no por persona). Si tu apto tiene 5 inquilinos, igual cuenta como 1 unidad. Hasta 15 unidades, gratis para siempre.",
  },
  {
    q: "¿Cumple con la legislación de mi país?",
    a: "El voto ponderado por alícuota cumple con la Ley de Propiedad Horizontal en Venezuela, Colombia, Argentina, México, Perú y Chile. Cada decisión queda con timestamp inmutable + lista de votantes para acta legal.",
  },
  {
    q: "¿Pueden ver mis vecinos cuánto debo?",
    a: "No. Solo vos y los administradores ven tu saldo. Lo que sí pueden ver, si la junta lo activa, es la lista de unidades morosas (sin nombres ni montos), para presión social positiva.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-frost text-marine-deep overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════
          NAV — flotante, glassmorphism, links a secciones
      ═══════════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-5">
          <div className="flex items-center justify-between rounded-2xl bg-frost/80 backdrop-blur-xl border border-marine/15 px-5 py-3">
            <Link href="/" className="flex items-center hover-scale" aria-label="Atryum — inicio">
              <AtryumLogo
                variant="horizontal"
                tone="color"
                className="text-[22px] md:text-[26px]"
              />
            </Link>

            <div className="hidden md:flex items-center gap-0.5 text-[13px] text-mute">
              <a href="#dolor" className="px-3 py-1.5 rounded-lg hover:text-marine-deep hover:bg-marine/10 transition-all duration-200">
                El dolor
              </a>
              <a href="#wow" className="px-3 py-1.5 rounded-lg hover:text-marine-deep hover:bg-marine/10 transition-all duration-200">
                Producto
              </a>
              <a href="#audiencia" className="px-3 py-1.5 rounded-lg hover:text-marine-deep hover:bg-marine/10 transition-all duration-200">
                Para vos
              </a>
              <a href="#precio" className="px-3 py-1.5 rounded-lg hover:text-marine-deep hover:bg-marine/10 transition-all duration-200">
                Precio
              </a>
              <a href="#faq" className="px-3 py-1.5 rounded-lg hover:text-marine-deep hover:bg-marine/10 transition-all duration-200">
                FAQ
              </a>
            </div>

            <Link
              href={PORTAL_LOGIN}
              className="bg-marine-deep text-frost text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-marine transition-colors btn-press"
            >
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          HERO — dual-track con doble CTA según audiencia
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 mesh-signature pointer-events-none" aria-hidden="true" />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#0F2E5A 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid md:grid-cols-12 gap-10 md:gap-8 items-center">
            <div className="md:col-span-6 lg:col-span-6">
              <span className="hero-text font-meta-loose text-cyan">
                CONDOMINIOS · LATAM · 2026
              </span>

              <h1 className="hero-text hero-text-d1 mt-6 font-display text-[clamp(2.5rem,5.8vw,4.75rem)] leading-[1.03] tracking-[-0.035em] text-marine-deep">
                Tu condominio,{" "}
                <em className="font-editorial text-cyan">finalmente</em>{" "}
                en una sola pantalla.
              </h1>

              <p className="hero-text hero-text-d2 mt-6 text-[17px] leading-[1.65] text-mute max-w-lg">
                Cobranza por alícuota. Visitantes con QR + WhatsApp. Voto
                ponderado en asambleas. Presupuesto que todos auditan.
                Sin obra. Sin cableado. Sin Excel.
              </p>

              <div className="hero-text hero-text-d3 mt-9 flex flex-wrap items-center gap-3">
                <Magnetic strength={0.25}>
                  <Link
                    href={PORTAL_LOGIN}
                    className="group bg-marine-deep text-frost text-[15px] font-medium pl-6 pr-4 py-3.5 rounded-xl hover:bg-marine inline-flex items-center gap-3 press-spring shadow-[0_8px_30px_rgb(15,46,90,0.16)] hover:shadow-[0_14px_40px_rgb(15,46,90,0.22)] transition-shadow duration-500"
                  >
                    Soy junta · Probar gratis
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-frost/10 group-hover:bg-frost/20 transition-colors">
                      <svg className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                      </svg>
                    </span>
                  </Link>
                </Magnetic>
                <Magnetic strength={0.18}>
                  <a
                    href="#wow"
                    className="text-[14px] font-medium text-marine-deep px-5 py-3.5 rounded-xl border border-marine/25 hover:bg-marine/10 hover:border-marine/40 transition-colors press-spring inline-block"
                  >
                    Soy residente · Ver demo
                  </a>
                </Magnetic>
              </div>

              <p className="hero-text hero-text-d4 mt-6 font-meta text-mute">
                GRATIS HASTA 15 UNIDADES · SIN TARJETA · SIN CONTRATO
              </p>
            </div>

            {/* Hero card */}
            <div className="md:col-span-6 lg:col-span-6 flex justify-center md:justify-end">
              <div className="relative hero-aside w-full max-w-[480px]">
                <TiltCard max={6} glare className="relative rounded-3xl bg-marine-deep text-frost p-8 md:p-10 overflow-hidden grain shadow-[0_32px_80px_-20px_rgb(15,46,90,0.5)]">
                  <div className="flex items-center justify-between">
                    <span className="font-meta-loose text-ember">
                      RESIDENCIAS COSTA DE PLATA
                    </span>
                    <AtryumSymbol tone="ember" className="h-4 w-4" />
                  </div>

                  <div className="mt-12 md:mt-16 flex items-end justify-between">
                    <AtryumSymbol tone="ember" className="h-32 w-32 md:h-40 md:w-40" />
                    <div className="text-right">
                      <p className="font-meta text-frost/60">RECAUDACIÓN ABRIL</p>
                      <p className="mt-1.5 font-display text-4xl md:text-5xl text-frost tabular-nums">
                        <AnimatedCounter value={94} suffix="%" duration={1400} />
                      </p>
                      <p className="mt-1 text-[11px] text-frost/50">↑ 22 vs marzo</p>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-frost/10 grid grid-cols-3 gap-4">
                    <div>
                      <p className="font-meta text-frost/60">UNIDADES</p>
                      <p className="mt-1.5 font-display text-xl text-frost tabular-nums">
                        <AnimatedCounter value={14} duration={1200} />
                      </p>
                    </div>
                    <div>
                      <p className="font-meta text-frost/60">VISITAS HOY</p>
                      <p className="mt-1.5 font-display text-xl text-frost tabular-nums">
                        <AnimatedCounter value={37} duration={1400} />
                      </p>
                    </div>
                    <div>
                      <p className="font-meta text-frost/60">VOTANDO</p>
                      <p className="mt-1.5 font-display text-xl text-ember tabular-nums">
                        <AnimatedCounter value={2} duration={1000} />
                      </p>
                    </div>
                  </div>
                </TiltCard>

                {/* Floating cards */}
                <div className="absolute -left-6 -bottom-8 md:-left-16 md:-bottom-10 hidden sm:block hero-card-float hero-card-float-d1 float-gentle">
                  <div className="bg-card rounded-2xl shadow-[0_18px_50px_rgba(15,46,90,0.10)] border border-border p-5 w-56">
                    <p className="font-meta text-cyan">PAGO RECIBIDO</p>
                    <p className="mt-2 font-display text-[28px] text-marine-deep leading-tight tabular-nums">
                      $84<span className="text-mute text-lg">.50</span>
                    </p>
                    <p className="mt-1 text-[12px] text-mute">3 cuotas · APTO 1-A</p>
                  </div>
                </div>

                <div className="absolute -right-4 top-12 md:-right-12 md:top-20 hidden md:block hero-card-float hero-card-float-d2 float-gentle-d1">
                  <div className="bg-card rounded-2xl shadow-[0_18px_50px_rgba(15,46,90,0.10)] border border-border p-4 w-52">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan animate-pulse" />
                      <p className="font-meta text-cyan">VISITA CONFIRMADA</p>
                    </div>
                    <p className="mt-2 text-[14px] font-medium text-marine-deep">Uber · ABC123</p>
                    <p className="text-[11px] text-mute">→ APTO 2-A · 4H</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-20 md:mt-28 pt-10 border-t border-marine/10">
            <p className="font-meta text-mute text-center mb-6">CONSTRUIDO SOBRE INFRAESTRUCTURA QUE NO SE CAE</p>
            <div className="flex items-center justify-center gap-8 md:gap-14 flex-wrap opacity-60">
              <span className="font-display text-[18px] text-marine-deep">▲ Vercel</span>
              <span className="font-display text-[18px] text-marine-deep">⚡ Supabase</span>
              <span className="font-display text-[18px] text-marine-deep">✉ Resend</span>
              <span className="font-display text-[18px] text-marine-deep">🔒 SSL · TLS 1.3</span>
              <span className="font-display text-[18px] text-marine-deep">🛡 RLS Postgres</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN 2 · EL DOLOR REAL — quotes-as-stats
      ═══════════════════════════════════════════════════════════════ */}
      <section id="dolor" className="relative py-24 md:py-32 bg-marine-deep text-frost overflow-hidden grain">
        <div className="absolute inset-0 mesh-signature-dark opacity-50 pointer-events-none" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="max-w-3xl">
              <span className="font-meta-loose text-ember">EL DOLOR REAL</span>
              <h2 className="mt-6 font-display text-[clamp(2rem,4.2vw,3.5rem)] leading-[1.08] tracking-[-0.03em] text-frost">
                Tu condominio funciona con un grupo de WhatsApp, una hoja de{" "}
                <em className="font-editorial text-ember">Excel</em>{" "}
                y mucha desconfianza.
              </h2>
              <p className="mt-7 text-[17px] text-frost/60 leading-relaxed max-w-2xl">
                Le preguntamos a 40+ residentes y juntas en Caracas, Bogotá y
                CDMX. Estas son las frases que más se repitieron.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {[
              {
                quote: "Pagué hace 2 semanas y la junta sigue diciendo que estoy moroso.",
                who: "RESIDENTE",
                city: "CARACAS",
              },
              {
                quote: "La asamblea siempre termina en pelea. Nadie se pone de acuerdo en cómo se cuenta el voto.",
                who: "JUNTA",
                city: "BOGOTÁ",
              },
              {
                quote: "Reporté la fuga del baño hace 3 meses. Ya cambió de admin y nadie sabe nada.",
                who: "RESIDENTE",
                city: "CDMX",
              },
            ].map((q, i) => (
              <Reveal key={i} delay={i * 140}>
                <div className="group rounded-2xl border border-frost/10 bg-frost/[0.03] p-7 transition-all duration-500 hover:border-ember/40 hover:bg-frost/[0.05] hover:-translate-y-1 h-full flex flex-col">
                  <span className="font-display text-ember text-5xl leading-none mb-4" aria-hidden="true">&ldquo;</span>
                  <p className="text-[16px] text-frost leading-relaxed flex-1">{q.quote}</p>
                  <div className="mt-6 pt-5 border-t border-frost/10 flex items-center justify-between">
                    <span className="font-meta text-ember">{q.who}</span>
                    <span className="font-meta text-frost/40">{q.city}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={400}>
            <div className="mt-14 max-w-3xl">
              <p className="text-[17px] text-frost/80 leading-relaxed">
                Atryum no es Excel con esteroides. Es la app que tu condominio
                debió tener desde el principio: <em className="font-editorial text-ember">los datos en
                un solo lugar, las reglas explícitas, las decisiones auditables</em>.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN 3 · LOS 5 WOWs — sticky scroll storytelling
      ═══════════════════════════════════════════════════════════════ */}
      <section id="wow" className="py-24 md:py-32 relative">
        <div className="mx-auto max-w-7xl px-5 md:px-8 lg:px-16">
          <Reveal>
            <div className="max-w-3xl mb-16 md:mb-24">
              <span className="font-meta-loose text-cyan">LOS 5 WOWs</span>
              <h2 className="mt-6 font-display text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.08] tracking-[-0.03em] text-marine-deep">
                Lo que hace que tus residentes lo{" "}
                <em className="font-editorial text-cyan">amen</em>.
              </h2>
              <p className="mt-5 text-[17px] text-mute leading-relaxed max-w-2xl">
                Cinco features que ningún competidor en LATAM tiene juntas.
                El cuarto es el que más nos piden y nadie más lo hace bien.
              </p>
            </div>
          </Reveal>

          <WowStack items={wowItems} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN 4 · CÓMO FUNCIONA EN 3 PASOS
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-cloud/40 border-y border-border">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="font-meta-loose text-cyan">CÓMO FUNCIONA</span>
              <h2 className="mt-6 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-0.03em] text-marine-deep">
                De cero a operativo en{" "}
                <em className="font-editorial text-cyan">10 minutos</em>.
              </h2>
              <p className="mt-4 text-[16px] text-mute">
                Sin instaladores. Sin reuniones de venta. Sin migración mágica.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <StepsVisual />
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN 5 · PARA VOS — tabs Residente / Junta
      ═══════════════════════════════════════════════════════════════ */}
      <section id="audiencia" className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="font-meta-loose text-cyan">PARA VOS</span>
              <h2 className="mt-6 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-0.03em] text-marine-deep">
                Una app que sirve a los{" "}
                <em className="font-editorial text-cyan">dos lados</em>.
              </h2>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <AudienceTabs
              resident={{
                headline: "Pagás justo, sabés qué pasa, votás con peso",
                benefits: [
                  { icon: "💸", title: "Pagás lo que te toca", desc: "Cuotas calculadas con tu alícuota real, no por igualado." },
                  { icon: "⚡", title: "Pagás en 30 segundos", desc: "Pago Móvil, Zelle, transferencia, Binance. Lo que uses." },
                  { icon: "📲", title: "Compartís visitas", desc: "Generás QR y lo mandás por WhatsApp en un toque." },
                  { icon: "🗳️", title: "Votás de verdad", desc: "Tu voto pesa lo que vale tu apto, no como en el Whatsapp." },
                ],
              }}
              board={{
                headline: "Cobrás más, peleás menos, decidís con datos",
                benefits: [
                  { icon: "📈", title: "Subís recaudación", desc: "Recordatorios automáticos + transparencia bajan la morosidad." },
                  { icon: "📊", title: "Asambleas con quórum real", desc: "Voto ponderado por alícuota = acta legalmente vinculante." },
                  { icon: "🛡️", title: "Cero discusiones", desc: "Cada gasto tiene categoría, recibo y se puede anular con razón." },
                  { icon: "⏱️", title: "Recuperás tiempo", desc: "Adiós al WhatsApp 24/7. Todo queda en su flujo correspondiente." },
                ],
              }}
              cta={
                <Magnetic strength={0.22}>
                  <Link
                    href={PORTAL_LOGIN}
                    className="group bg-marine-deep text-frost text-[15px] font-medium pl-6 pr-4 py-3.5 rounded-xl hover:bg-marine inline-flex items-center gap-3 press-spring shadow-[0_8px_30px_rgb(15,46,90,0.16)] hover:shadow-[0_14px_40px_rgb(15,46,90,0.22)] transition-shadow duration-500"
                  >
                    Empezar gratis
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-frost/10 group-hover:bg-frost/20 transition-colors">
                      <svg className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                      </svg>
                    </span>
                  </Link>
                </Magnetic>
              }
            />
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN 6 · PRECIO HONESTO
      ═══════════════════════════════════════════════════════════════ */}
      <section id="precio" className="py-24 md:py-32 bg-cloud/40">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <span className="font-meta-loose text-cyan">PRECIO</span>
              <h2 className="mt-6 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-0.03em] text-marine-deep">
                Empezá gratis. Pagás solo si{" "}
                <em className="font-editorial text-cyan">crecés</em>.
              </h2>
              <p className="mt-4 text-[16px] text-mute">
                Sin setup. Sin contrato. Cancelás cuando quieras.
                Todo lo de la lista ya está construido en producción.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            <Reveal>
              <PricingCard
                title="Starter"
                price="Gratis"
                subtitle="Hasta 15 unidades, para siempre"
                cta="Crear cuenta gratis"
                ctaHref={PORTAL_LOGIN}
                features={[
                  "Cobranza por alícuota / plano / tipo",
                  "Comprobante para múltiples cuotas",
                  "Mantenimiento con foto + tracking",
                  "Visitantes con QR + WhatsApp share",
                  "Decisiones (encuestas + asambleas)",
                  "Voto ponderado por alícuota",
                  "Anuncios con prioridad",
                ]}
              />
            </Reveal>

            <Reveal delay={120}>
              <PricingCard
                variant="featured"
                title="Pro"
                price="$2"
                priceSuffix="/ud/mes"
                subtitle="El plan completo"
                cta="Empezar prueba gratis"
                ctaHref={PORTAL_LOGIN}
                features={[
                  "Todo lo de Starter, sin límite de unidades",
                  "Presupuesto anual con override mensual",
                  "Vista ejecutado vs aprobado",
                  "Categorías de gasto + proveedores",
                  "Anular gasto con razón obligatoria",
                  "Reservas de áreas comunes",
                  "Multi-moneda (USD + Bs)",
                  "Multi-unidad (varias propiedades, un login)",
                ]}
              />
            </Reveal>

            <Reveal delay={240}>
              <PricingCard
                title="Business"
                price="$3"
                priceSuffix="/ud/mes"
                subtitle="Administradoras profesionales"
                cta="Hablar con ventas"
                ctaHref={PORTAL_LOGIN}
                features={[
                  "Todo lo de Pro",
                  "Multi-condominio bajo 1 cuenta",
                  "Branding personalizado",
                  "SLA 99.9%",
                  "Soporte prioritario",
                  "Onboarding asistido",
                ]}
              />
            </Reveal>
          </div>

          <Reveal delay={400}>
            <p className="text-center mt-12 font-meta text-mute">
              ¿15 unidades exactas? · GRATIS PARA SIEMPRE · NUNCA TE COBRAREMOS POR USUARIO
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN 7 · FAQ
      ═══════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-5 md:px-8">
          <Reveal>
            <div className="mb-12">
              <span className="font-meta-loose text-cyan">PREGUNTAS DURAS</span>
              <h2 className="mt-6 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-0.03em] text-marine-deep">
                Las que la junta{" "}
                <em className="font-editorial text-cyan">siempre</em> pregunta.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <FAQAccordion items={faqs} />
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECCIÓN 8 · CTA FINAL
      ═══════════════════════════════════════════════════════════════ */}
      <Reveal>
        <section className="relative py-28 md:py-40 bg-marine-deep text-frost overflow-hidden grain">
          <div className="absolute inset-0 mesh-signature-dark opacity-60 pointer-events-none" aria-hidden="true" />
          <div className="relative mx-auto max-w-4xl px-5 md:px-8 text-center">
            <AtryumSymbol tone="ember" className="h-14 w-14 mx-auto mb-8" />
            <h2 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.05] tracking-[-0.035em]">
              Dale a tu condominio
              <br />
              la <em className="font-editorial text-ember">app</em> que se merece.
            </h2>
            <p className="mt-6 text-[17px] text-frost/60 max-w-lg mx-auto">
              2 minutos para registrarte. Sin tarjeta. Sin contrato.
              Gratis hasta 15 unidades.
            </p>
            <div className="mt-10">
              <Magnetic strength={0.3}>
                <Link
                  href={PORTAL_LOGIN}
                  className="group bg-ember text-marine-deep text-[15px] font-medium pl-7 pr-5 py-4 rounded-xl inline-flex items-center gap-3 press-spring shadow-[0_16px_44px_-12px_rgb(232,115,44,0.55)] hover:shadow-[0_24px_60px_-10px_rgb(232,115,44,0.7)] transition-shadow duration-500"
                >
                  Empezar gratis ahora
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-marine-deep/10 group-hover:bg-marine-deep/25 transition-colors">
                    <svg className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                    </svg>
                  </span>
                </Link>
              </Magnetic>
            </div>
            <p className="mt-8 font-meta text-frost/50">
              ¿PREGUNTAS? · ESCRIBINOS A HOLA@ATRYUM.NET
            </p>
          </div>
        </section>
      </Reveal>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border py-12 bg-frost">
        <div className="mx-auto max-w-7xl px-5 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <AtryumLogo variant="horizontal" tone="color" className="text-[16px]" />
            <span className="font-editorial text-mute text-[15px] hidden md:inline">
              Un átrium dentro de cada A.
            </span>
          </div>
          <p className="font-meta text-mute">
            HECHO POR{" "}
            <a
              href="https://tuwebgo.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan hover:underline"
            >
              TUWEBGO.NET
            </a>
          </p>
        </div>
      </footer>

      {/* SEO structured data */}
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
              "App de gestión de condominios para Latam. Cobranza por alícuota, voto ponderado en asambleas, visitantes con QR + WhatsApp, presupuesto que todos auditan.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: "Gratis hasta 15 unidades",
            },
            creator: {
              "@type": "Organization",
              name: "Atryum",
              url: "https://atryum.net",
            },
          }),
        }}
      />
    </div>
  );
}

interface PricingCardProps {
  title: string;
  price: string;
  priceSuffix?: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  features: string[];
  variant?: "default" | "featured";
}

function PricingCard({
  title,
  price,
  priceSuffix,
  subtitle,
  cta,
  ctaHref,
  features,
  variant = "default",
}: PricingCardProps) {
  const featured = variant === "featured";

  return (
    <div
      className={`relative rounded-2xl p-7 h-full hover-lift ${
        featured
          ? "bg-marine-deep text-frost border border-marine-deep shadow-[0_20px_60px_rgba(15,46,90,0.18)]"
          : "bg-card text-marine-deep border border-border"
      }`}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ember text-marine-deep font-meta px-3 py-1 rounded-full badge-pop badge-pop-d1">
          MÁS ELEGIDO
        </div>
      )}

      <p className={`font-meta ${featured ? "text-ember" : "text-mute"}`}>
        {title.toUpperCase()}
      </p>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-[40px] leading-none">{price}</span>
        {priceSuffix && (
          <span className={`text-[14px] ${featured ? "text-frost/60" : "text-mute"}`}>
            {priceSuffix}
          </span>
        )}
      </div>
      <p className={`mt-2 text-[13px] ${featured ? "text-frost/60" : "text-mute"}`}>
        {subtitle}
      </p>

      <Link
        href={ctaHref}
        className={`mt-6 w-full py-3 rounded-xl text-[13px] font-medium transition-colors btn-press flex items-center justify-center ${
          featured
            ? "bg-ember text-marine-deep hover:bg-ember"
            : "border border-marine/25 text-marine-deep hover:bg-marine/10"
        }`}
      >
        {cta}
      </Link>

      <div
        className={`mt-6 pt-6 space-y-3 border-t ${
          featured ? "border-frost/10" : "border-border"
        }`}
      >
        {features.map((f) => (
          <div
            key={f}
            className={`flex items-start gap-2.5 text-[13px] ${
              featured ? "text-frost/80" : "text-marine-deep/75"
            }`}
          >
            <svg
              className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-ember" : "text-cyan"}`}
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 10.5L8 14.5L16 6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}
