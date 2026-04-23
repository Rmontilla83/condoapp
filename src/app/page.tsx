import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { AtryumLogo, AtryumSymbol } from "@/components/brand/atryum-logo";

const PORTAL_LOGIN = process.env.NEXT_PUBLIC_PORTAL_URL
  ? `${process.env.NEXT_PUBLIC_PORTAL_URL}/login`
  : "/login";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bone text-ink overflow-hidden">
      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-5">
          <div className="flex items-center justify-between rounded-2xl bg-bone/80 backdrop-blur-xl border border-ink/[0.06] px-5 py-3">
            <Link href="/" className="flex items-center hover-scale" aria-label="Atryum — inicio">
              <AtryumLogo variant="horizontal" tone="ink" className="h-7" />
            </Link>

            <div className="hidden md:flex items-center gap-0.5 text-[13px] text-mute">
              <a href="#problema" className="px-3 py-1.5 rounded-lg hover:text-ink hover:bg-ink/[0.04] transition-all duration-200">El problema</a>
              <a href="#solucion" className="px-3 py-1.5 rounded-lg hover:text-ink hover:bg-ink/[0.04] transition-all duration-200">Producto</a>
              <a href="#precio" className="px-3 py-1.5 rounded-lg hover:text-ink hover:bg-ink/[0.04] transition-all duration-200">Precio</a>
            </div>

            <Link
              href={PORTAL_LOGIN}
              className="bg-ink text-bone text-[13px] font-medium px-4 py-2 rounded-lg hover:bg-ink-deep transition-colors btn-press"
            >
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-32">
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#0E1116 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid md:grid-cols-12 gap-10 md:gap-8 items-center">
            {/* Copy */}
            <div className="md:col-span-6 lg:col-span-6">
              <span className="hero-text font-meta-loose text-steel">
                PROPTECH · LATAM
              </span>

              <h1 className="hero-text hero-text-d1 mt-6 font-display text-[clamp(2.5rem,5.8vw,4.75rem)] leading-[1.03] tracking-[-0.035em] text-ink">
                La app que tu condominio{" "}
                <em className="font-editorial text-steel">merece</em>.
              </h1>

              <p className="hero-text hero-text-d2 mt-6 text-[17px] leading-[1.65] text-mute max-w-lg">
                Pagos transparentes, mantenimiento con foto, acceso QR para visitantes
                y finanzas que cualquiera puede auditar. En una sola app — sin obra, sin cableado.
              </p>

              <div className="hero-text hero-text-d3 mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href={PORTAL_LOGIN}
                  className="group bg-ink text-bone text-[15px] font-medium pl-6 pr-4 py-3.5 rounded-xl hover:bg-ink-deep transition-all duration-300 inline-flex items-center gap-3 btn-press"
                >
                  Empezar gratis
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-bone/10 group-hover:bg-bone/15 transition-colors">
                    <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                    </svg>
                  </span>
                </Link>
                <a
                  href="#solucion"
                  className="text-[14px] font-medium text-ink px-5 py-3.5 rounded-xl border border-ink/15 hover:bg-ink/[0.04] transition-colors btn-press"
                >
                  Ver producto
                </a>
              </div>

              <p className="hero-text hero-text-d4 mt-6 font-meta text-mute">
                GRATIS HASTA 15 UNIDADES · SIN TARJETA
              </p>
            </div>

            {/* Right — Ink scene with Sand A + floating card */}
            <div className="md:col-span-6 lg:col-span-6 flex justify-center md:justify-end">
              <div className="relative hero-aside w-full max-w-[480px]">
                {/* Main ink card */}
                <div className="relative rounded-3xl bg-ink text-bone p-8 md:p-10 overflow-hidden grain">
                  <div className="flex items-center justify-between">
                    <span className="font-meta-loose text-sand">
                      EDIFICIO · RESIDENCIAS LOS ROBLES
                    </span>
                    <AtryumSymbol tone="sand" className="h-4 w-4" />
                  </div>

                  <div className="mt-16 md:mt-20 flex items-end justify-between">
                    <AtryumSymbol tone="sand" className="h-40 w-40 md:h-48 md:w-48" />
                    <div className="text-right">
                      <p className="font-meta text-bone/60">OCUPACIÓN</p>
                      <p className="mt-1.5 font-display text-4xl md:text-5xl text-bone">
                        96.2<span className="text-bone/50 text-2xl">%</span>
                      </p>
                      <p className="mt-1 text-[11px] text-bone/50">↑ 1.4 vs mar</p>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-bone/10 grid grid-cols-3 gap-4">
                    <div>
                      <p className="font-meta text-bone/60">CUOTAS AL DÍA</p>
                      <p className="mt-1.5 font-display text-xl text-bone">94%</p>
                    </div>
                    <div>
                      <p className="font-meta text-bone/60">INCIDENCIAS</p>
                      <p className="mt-1.5 font-display text-xl text-bone">8</p>
                    </div>
                    <div>
                      <p className="font-meta text-bone/60">ACCESOS 24H</p>
                      <p className="mt-1.5 font-display text-xl text-bone">1.284</p>
                    </div>
                  </div>
                </div>

                {/* Floating payment card */}
                <div className="absolute -left-6 -bottom-8 md:-left-16 md:-bottom-10 hidden sm:block hero-card-float hero-card-float-d1 float-gentle">
                  <div className="bg-card rounded-2xl shadow-[0_18px_50px_rgba(14,17,22,0.10)] border border-border p-5 w-56">
                    <p className="font-meta text-steel">PAGO CONFIRMADO</p>
                    <p className="mt-2 font-display text-[28px] text-ink leading-tight">
                      $85<span className="text-mute text-lg">.00</span>
                    </p>
                    <p className="mt-1 text-[12px] text-mute">Cuota abril · Apto 1-A</p>
                  </div>
                </div>

                {/* Floating access card */}
                <div className="absolute -right-4 top-16 md:-right-12 md:top-24 hidden md:block hero-card-float hero-card-float-d2 float-gentle-d1">
                  <div className="bg-card rounded-2xl shadow-[0_18px_50px_rgba(14,17,22,0.10)] border border-border p-4 w-52">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-steel animate-pulse" />
                      <p className="font-meta text-steel">VISITANTE VERIFICADO</p>
                    </div>
                    <p className="mt-2 text-[14px] font-medium text-ink">María García</p>
                    <p className="text-[11px] text-mute">V-18.456.789 → Apto 1-A</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PROBLEMA — Ink section ═══ */}
      <section id="problema" className="relative py-24 md:py-32 bg-ink text-bone overflow-hidden grain">
        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="max-w-3xl">
              <span className="font-meta-loose text-sand">EL PROBLEMA REAL</span>
              <h2 className="mt-6 font-display text-[clamp(2rem,4.2vw,3.5rem)] leading-[1.08] tracking-[-0.03em] text-bone">
                Tu condominio funciona con un grupo de WhatsApp, una planilla de{" "}
                <em className="font-editorial text-sand">Excel</em>{" "}
                y mucha desconfianza.
              </h2>
              <p className="mt-7 text-[17px] text-bone/60 leading-relaxed max-w-2xl">
                Nadie sabe a dónde va el dinero. Los reportes de mantenimiento se pierden.
                Las visitas son un caos en la puerta. Y la junta está agotada de hacer todo
                manual.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 grid md:grid-cols-3 gap-5">
            {[
              { number: "73%", text: "de residentes en Latam no confían en cómo se administra su condominio" },
              { number: "45min", text: "promedio diario que gasta un admin respondiendo en WhatsApp" },
              { number: "15-40%", text: "de morosidad promedio en condominios sin sistema digital" },
            ].map((stat, i) => (
              <Reveal key={stat.number} delay={i * 120}>
                <div className="rounded-2xl border border-bone/10 bg-bone/[0.03] p-7 hover-lift">
                  <p className="font-display text-[44px] text-sand leading-none">{stat.number}</p>
                  <p className="mt-4 text-[14px] text-bone/70 leading-relaxed">{stat.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOLUCION ═══ */}
      <section id="solucion" className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="max-w-3xl mb-20 md:mb-28">
              <span className="font-meta-loose text-steel">LA SOLUCIÓN</span>
              <h2 className="mt-6 font-display text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.08] tracking-[-0.03em] text-ink">
                Todo lo que tu condominio necesita.
                <br />
                Nada que <em className="font-editorial text-steel">no</em> necesite.
              </h2>
            </div>
          </Reveal>

          {/* F1: Payments */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-20 items-center mb-28 md:mb-36">
            <Reveal>
              <div>
                <span className="font-meta text-steel">01 · PAGOS</span>
                <h3 className="mt-4 font-display text-[28px] md:text-[34px] text-ink leading-[1.12] tracking-[-0.025em]">
                  Cobrar dejó de ser un dolor de cabeza
                </h3>
                <p className="mt-4 text-[16px] text-mute leading-relaxed">
                  Cada residente ve cuánto debe, con desglose. Paga con Pago Móvil, Zelle
                  o transferencia. Sube el comprobante. El admin recibe notificación.
                  La morosidad baja sin perseguir a nadie.
                </p>
                <ul className="mt-6 space-y-3" role="list">
                  {[
                    "Estado de cuenta siempre actualizado",
                    "Recordatorio automático pre-vencimiento",
                    "Comprobante con foto del pago",
                    "Admin ve quién pagó y quién no en tiempo real",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[14px] text-ink/80">
                      <CheckIcon className="mt-0.5 h-4 w-4 text-steel shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="rounded-3xl bg-cloud/50 border border-border p-8 md:p-10">
                <div className="space-y-4">
                  <div className="bg-card rounded-2xl p-5 border border-border hover-lift">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[13px] font-medium text-ink">Cuota Abril 2026</p>
                        <p className="font-meta text-mute mt-1">VENCE 15 DE ABRIL</p>
                      </div>
                      <span className="font-meta text-sand bg-sand/15 px-2.5 py-1 rounded-md">
                        PENDIENTE
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="font-display text-[38px] text-ink leading-none">
                        $85<span className="text-mute text-[20px]">.00</span>
                      </p>
                      <span className="bg-ink text-bone text-[12px] font-medium px-4 py-2 rounded-lg">
                        Pagar ahora
                      </span>
                    </div>
                  </div>
                  <div className="bg-card rounded-2xl p-5 border border-border opacity-70">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-ink">Cuota Marzo 2026</p>
                        <p className="font-meta text-mute mt-1">PAGADO 10 DE MARZO</p>
                      </div>
                      <span className="font-meta text-steel bg-steel/10 px-2.5 py-1 rounded-md">
                        PAGADO
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* F2: Maintenance — reversed */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-20 items-center mb-28 md:mb-36">
            <Reveal className="md:order-2">
              <div>
                <span className="font-meta text-steel">02 · MANTENIMIENTO</span>
                <h3 className="mt-4 font-display text-[28px] md:text-[34px] text-ink leading-[1.12] tracking-[-0.025em]">
                  &ldquo;Lo reporté hace 3 meses y nadie hizo nada&rdquo;{" "}
                  <em className="font-editorial text-steel">— nunca más</em>
                </h3>
                <p className="mt-4 text-[16px] text-mute leading-relaxed">
                  El residente toma foto, describe el problema y envía. El admin asigna
                  responsable. Cada cambio de status genera notificación. Nadie puede
                  decir &ldquo;no sabía&rdquo;.
                </p>
                <ul className="mt-6 space-y-3" role="list">
                  {[
                    "Reporte con fotos del problema",
                    "Tracking visual: nuevo → en revisión → resuelto",
                    "Notificación automática en cada cambio",
                    "Historial completo auditable",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[14px] text-ink/80">
                      <CheckIcon className="mt-0.5 h-4 w-4 text-steel shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={150} className="md:order-1">
              <div className="rounded-3xl bg-cloud/50 border border-border p-8 md:p-10">
                <div className="bg-card rounded-2xl p-6 border border-border hover-lift">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-[14px] font-medium text-ink">Fuga de agua — Baño piso 1</p>
                      <p className="font-meta text-mute mt-1">REPORTADO HACE 2 DÍAS · RAFAEL M.</p>
                    </div>
                    <span className="font-meta text-sand bg-sand/15 px-2.5 py-1 rounded-md shrink-0">
                      EN PROGRESO
                    </span>
                  </div>
                  <div className="flex gap-1.5 mb-2.5" role="progressbar" aria-valuenow={75} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de solicitud">
                    <div className="h-1 flex-1 rounded-full bg-ink" />
                    <div className="h-1 flex-1 rounded-full bg-ink" />
                    <div className="h-1 flex-1 rounded-full bg-sand" />
                    <div className="h-1 flex-1 rounded-full bg-border" />
                  </div>
                  <div className="flex justify-between font-meta text-mute">
                    <span className="text-ink">NUEVO</span>
                    <span className="text-ink">REVISIÓN</span>
                    <span className="text-sand">EN CURSO</span>
                    <span>RESUELTO</span>
                  </div>
                  <div className="mt-5 pt-5 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-steel text-bone text-[10px] font-medium flex items-center justify-center">JP</div>
                      <span className="text-[12px] text-mute">Asignado a Juan Plomero</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* F3: QR */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-20 items-center mb-28 md:mb-36">
            <Reveal>
              <div>
                <span className="font-meta text-steel">03 · ACCESO</span>
                <h3 className="mt-4 font-display text-[28px] md:text-[34px] text-ink leading-[1.12] tracking-[-0.025em]">
                  Tus visitantes entran con un QR,
                  <em className="font-editorial text-steel"> no con una llamada</em>
                </h3>
                <p className="mt-4 text-[16px] text-mute leading-relaxed">
                  Ingresa nombre y cédula de tu visitante. Le llega un QR por WhatsApp.
                  El vigilante lo escanea y tiene todo: nombre, cédula, apartamento.
                  Sin llamadas, sin esperas.
                </p>
                <ul className="mt-6 space-y-3" role="list">
                  {[
                    "QR generado en segundos, enviado por WhatsApp",
                    "Vigilante escanea y verifica identidad al instante",
                    "Registro automático de cada acceso",
                    "Notificación cuando tu visitante llega",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[14px] text-ink/80">
                      <CheckIcon className="mt-0.5 h-4 w-4 text-steel shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="rounded-3xl bg-ink text-bone p-8 md:p-10 flex items-center justify-center relative overflow-hidden grain">
                <div className="w-full max-w-[280px] relative">
                  <div className="bg-bone rounded-2xl p-6 text-center">
                    <div className="mx-auto w-40 h-40 bg-bone rounded-xl border border-border flex items-center justify-center mb-4" role="img" aria-label="Código QR de visitante">
                      <div className="grid grid-cols-5 gap-1.5">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-4 w-4 rounded-[2px] ${
                              [0, 1, 2, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23, 24].includes(i)
                                ? "bg-ink"
                                : "bg-cloud"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[14px] font-medium text-ink">María García López</p>
                    <p className="font-meta text-mute mt-1">V-18.456.789</p>
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="font-meta text-steel flex items-center justify-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-steel" />
                        PASE VÁLIDO · APTO 1-A
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* F4: Transparency */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-20 items-center">
            <Reveal className="md:order-2">
              <div>
                <span className="font-meta text-steel">04 · TRANSPARENCIA</span>
                <h3 className="mt-4 font-display text-[28px] md:text-[34px] text-ink leading-[1.12] tracking-[-0.025em]">
                  &ldquo;¿A dónde va mi dinero?&rdquo;{" "}
                  <em className="font-editorial text-steel">Ahora lo puedes ver.</em>
                </h3>
                <p className="mt-4 text-[16px] text-mute leading-relaxed">
                  Cada residente ve ingresos y gastos del condominio. Cada gasto tiene
                  recibo. Reporte mensual automático en PDF listo para la asamblea.
                  Cero opacidad.
                </p>
                <div className="mt-7 inline-flex items-center gap-2.5 bg-steel/[0.08] border border-steel/20 rounded-lg px-4 py-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-steel" />
                  <span className="font-meta text-steel">REDUCE MOROSIDAD HASTA 30%</span>
                </div>
              </div>
            </Reveal>
            <Reveal delay={150} className="md:order-1">
              <div className="rounded-3xl bg-cloud/50 border border-border p-8 md:p-10">
                <div className="bg-card rounded-2xl p-6 border border-border hover-lift">
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
                    <p className="text-[13px] font-medium text-ink">Finanzas</p>
                    <p className="font-meta text-mute">MARZO 2026</p>
                  </div>
                  <div className="space-y-0">
                    {[
                      { label: "Cuotas recaudadas", amount: "+$510.00", tone: "text-steel" },
                      { label: "Limpieza mensual", amount: "−$200.00", tone: "text-ink/70" },
                      { label: "Vigilancia", amount: "−$450.00", tone: "text-ink/70" },
                      { label: "Reparación bomba", amount: "−$350.00", tone: "text-ink/70" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <span className="text-[13px] text-mute">{row.label}</span>
                        <span className={`font-medium ${row.tone}`}>{row.amount}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-4 mt-2">
                      <span className="text-[13px] font-medium text-ink">Balance</span>
                      <span className="font-display text-[22px] text-ink">−$490.00</span>
                    </div>
                  </div>
                  <button className="mt-3 w-full text-[12px] font-medium text-bone bg-ink rounded-xl py-2.5">
                    Descargar PDF del mes
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="precio" className="py-24 md:py-32 bg-cloud/40">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <span className="font-meta-loose text-steel">PRECIO</span>
              <h2 className="mt-6 font-display text-[clamp(2rem,4vw,3rem)] leading-[1.08] tracking-[-0.03em] text-ink">
                Empieza gratis. Crece sin{" "}
                <em className="font-editorial text-steel">límites</em>.
              </h2>
              <p className="mt-4 text-[16px] text-mute">
                Sin setup. Sin contrato. Cancela cuando quieras.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            <Reveal>
              <PricingCard
                title="Starter"
                price="Gratis"
                subtitle="Hasta 15 unidades, para siempre"
                cta="Crear cuenta gratis"
                ctaHref={PORTAL_LOGIN}
                features={[
                  "Pagos y estado de cuenta",
                  "Mantenimiento con tracking",
                  "Comunicados oficiales",
                  "QR para visitantes",
                ]}
              />
            </Reveal>

            <Reveal delay={120}>
              <PricingCard
                variant="featured"
                title="Pro"
                price="$2.50"
                priceSuffix="/ud/mes"
                subtitle="Todo incluido"
                cta="Iniciar prueba gratis"
                ctaHref={PORTAL_LOGIN}
                features={[
                  "Todo de Starter",
                  "Transparencia financiera",
                  "Reserva de áreas comunes",
                  "Multi-moneda Bs + USD",
                  "Reportes PDF automáticos",
                  "Unidades ilimitadas",
                ]}
              />
            </Reveal>

            <Reveal delay={240}>
              <PricingCard
                title="Business"
                price="$3.50"
                priceSuffix="/ud/mes"
                subtitle="Administradoras profesionales"
                cta="Contactar ventas"
                ctaHref={PORTAL_LOGIN}
                features={[
                  "Todo de Pro",
                  "Votaciones digitales",
                  "WhatsApp Business API",
                  "SLAs y escalamiento",
                  "Soporte prioritario",
                  "Multi-propiedad",
                ]}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA — editorial ink ═══ */}
      <Reveal>
        <section className="relative py-28 md:py-40 bg-ink text-bone overflow-hidden grain">
          <div className="relative mx-auto max-w-4xl px-5 md:px-8 text-center">
            <AtryumSymbol tone="sand" className="h-14 w-14 mx-auto mb-8" />
            <h2 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-[1.05] tracking-[-0.035em]">
              Dale a tu condominio
              <br />
              la <em className="font-editorial text-sand">app</em> que se merece.
            </h2>
            <p className="mt-6 text-[17px] text-bone/60 max-w-lg mx-auto">
              2 minutos para registrarte. Sin tarjeta. Sin contrato. Gratis hasta 15
              unidades.
            </p>
            <div className="mt-10">
              <Link
                href={PORTAL_LOGIN}
                className="group bg-sand text-ink text-[15px] font-medium pl-7 pr-5 py-4 rounded-xl hover:bg-sand-soft transition-all duration-300 inline-flex items-center gap-3 btn-press"
              >
                Empezar gratis ahora
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink/10 group-hover:bg-ink/15 transition-colors">
                  <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border py-12 bg-bone">
        <div className="mx-auto max-w-7xl px-5 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <AtryumLogo variant="horizontal" tone="ink" className="h-5" />
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
              className="text-steel hover:underline"
            >
              TUWEBGO.NET
            </a>
          </p>
        </div>
      </footer>

      {/* Structured data for SEO */}
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
              "App de gestión de condominios para Latinoamérica. Pagos, mantenimiento, acceso QR, transparencia financiera.",
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10.5L8 14.5L16 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
          ? "bg-ink text-bone border border-ink shadow-[0_20px_60px_rgba(14,17,22,0.18)]"
          : "bg-card text-ink border border-border"
      }`}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sand text-ink font-meta px-3 py-1 rounded-full badge-pop badge-pop-d1">
          POPULAR
        </div>
      )}

      <p
        className={`font-meta ${featured ? "text-sand" : "text-mute"}`}
      >
        {title.toUpperCase()}
      </p>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-[40px] leading-none">{price}</span>
        {priceSuffix && (
          <span
            className={`text-[14px] ${
              featured ? "text-bone/60" : "text-mute"
            }`}
          >
            {priceSuffix}
          </span>
        )}
      </div>
      <p className={`mt-2 text-[13px] ${featured ? "text-bone/60" : "text-mute"}`}>
        {subtitle}
      </p>

      <Link
        href={ctaHref}
        className={`mt-6 w-full py-3 rounded-xl text-[13px] font-medium transition-colors btn-press flex items-center justify-center ${
          featured
            ? "bg-sand text-ink hover:bg-sand-soft"
            : "border border-ink/15 text-ink hover:bg-ink/[0.04]"
        }`}
      >
        {cta}
      </Link>

      <div
        className={`mt-6 pt-6 space-y-3 border-t ${
          featured ? "border-bone/10" : "border-border"
        }`}
      >
        {features.map((f) => (
          <div
            key={f}
            className={`flex items-start gap-2.5 text-[13px] ${
              featured ? "text-bone/80" : "text-ink/75"
            }`}
          >
            <CheckIcon
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                featured ? "text-sand" : "text-steel"
              }`}
            />
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}
