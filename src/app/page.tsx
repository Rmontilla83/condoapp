import Link from "next/link";
import { Reveal } from "@/components/reveal";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAFBFC] overflow-hidden">
      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-4">
          <div className="flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur-xl border border-black/[0.04] px-5 py-3 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <Link href="/" className="flex items-center gap-2.5 hover-scale">
              <div className="h-9 w-9 rounded-xl bg-[#0F172A] flex items-center justify-center" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#2DD4BF]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-[17px] font-bold tracking-tight" style={{fontFamily:'Outfit,sans-serif'}}>
                condo<span className="text-[#0D9488]">app</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1 text-[13px] font-medium text-[#64748B]">
              <a href="#problema" className="px-3 py-1.5 rounded-lg hover:text-[#0F172A] hover:bg-black/[0.03] transition-all duration-200">El problema</a>
              <a href="#solucion" className="px-3 py-1.5 rounded-lg hover:text-[#0F172A] hover:bg-black/[0.03] transition-all duration-200">Solucion</a>
              <a href="#precio" className="px-3 py-1.5 rounded-lg hover:text-[#0F172A] hover:bg-black/[0.03] transition-all duration-200">Precio</a>
            </div>
            <Link href="/login" className="bg-[#0F172A] text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1E293B] transition-colors btn-press">
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(#0F172A 1px, transparent 1px)',backgroundSize:'24px 24px'}} aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid md:grid-cols-12 gap-8 md:gap-4 items-center">
            {/* Copy */}
            <div className="md:col-span-6 lg:col-span-5">
              <div className="hero-text badge-pop inline-flex items-center gap-2 bg-[#F0FDFA] border border-[#99F6E4] rounded-full px-3.5 py-1.5 mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0D9488] animate-pulse" />
                <span className="text-[12px] font-semibold text-[#0F766E] tracking-wide uppercase">Disponible ahora</span>
              </div>

              <h1 className="hero-text hero-text-d1 text-[clamp(2.5rem,5.5vw,4.5rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#0F172A]" style={{fontFamily:'Outfit,sans-serif'}}>
                La app que tu condominio{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">merece</span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 md:h-4 bg-[#99F6E4]/60 -z-0 rounded-sm" aria-hidden="true" />
                </span>
              </h1>

              <p className="hero-text hero-text-d2 mt-5 text-[17px] leading-[1.7] text-[#475569] max-w-lg">
                Pagos transparentes. Mantenimiento con foto y seguimiento. Acceso QR para visitantes. Sin contrasenas. Sin caos.
              </p>

              <div className="hero-text hero-text-d3 mt-8 flex flex-wrap items-center gap-3">
                <Link href="/login" className="group bg-[#0F172A] text-white text-[15px] font-semibold pl-7 pr-5 py-4 rounded-2xl hover:bg-[#1E293B] transition-all duration-300 flex items-center gap-3 shadow-[0_4px_24px_rgba(15,23,42,0.15)] hover:shadow-[0_8px_32px_rgba(15,23,42,0.2)] hover:-translate-y-0.5 btn-press">
                  Empezar gratis
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors duration-200">
                    <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                    </svg>
                  </span>
                </Link>
                <span className="text-[13px] text-[#94A3B8]">Gratis hasta 15 unidades</span>
              </div>

              <div className="hero-text hero-text-d4 mt-10 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {["#0D9488","#F59E0B","#6366F1","#EC4899"].map((c,i) => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold" style={{background:c}} aria-hidden="true">
                        {["RM","JL","AC","MV"][i]}
                      </div>
                    ))}
                  </div>
                  <div className="text-[12px] leading-tight text-[#64748B]">
                    <span className="font-semibold text-[#0F172A]">Condominios</span><br/>ya conectados
                  </div>
                </div>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="md:col-span-6 lg:col-span-7 flex justify-center md:justify-end">
              <div className="relative hero-phone">
                <div className="relative w-[280px] md:w-[320px] rounded-[2.5rem] bg-[#0F172A] p-3 shadow-[0_40px_100px_-20px_rgba(15,23,42,0.35)]">
                  <div className="rounded-[2rem] bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-2.5 bg-[#F8FAFC]">
                      <span className="text-[11px] font-semibold text-[#0F172A]">9:41</span>
                      <div className="flex gap-1"><div className="w-4 h-2 rounded-sm bg-[#0F172A]"/></div>
                    </div>
                    <div className="px-5 pt-4 pb-3 bg-white border-b border-[#F1F5F9]">
                      <p className="text-[11px] text-[#94A3B8] font-medium">Residencias Los Robles</p>
                      <p className="text-[18px] font-bold text-[#0F172A] mt-0.5" style={{fontFamily:'Outfit,sans-serif'}}>Hola, Rafael</p>
                    </div>
                    <div className="px-5 pt-4">
                      <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-5 text-white">
                        <p className="text-[11px] opacity-60 font-medium">Saldo pendiente</p>
                        <p className="text-[28px] font-extrabold mt-1" style={{fontFamily:'Outfit,sans-serif'}}>$85.00</p>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-[10px] opacity-50">Vence 15 Abr</span>
                          <span className="bg-[#2DD4BF] text-[#042F2E] text-[11px] font-bold px-4 py-1.5 rounded-lg">Pagar</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 pt-4 pb-2">
                      <div className="grid grid-cols-4 gap-2">
                        {[{icon:"💳",label:"Pagar"},{icon:"📸",label:"Reportar"},{icon:"🔑",label:"QR"},{icon:"📋",label:"Avisos"}].map((a) => (
                          <div key={a.label} className="flex flex-col items-center gap-1.5 py-2.5">
                            <div className="h-10 w-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center text-base">{a.icon}</div>
                            <span className="text-[10px] font-medium text-[#64748B]">{a.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="px-5 pt-3 pb-6">
                      <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2.5">Actividad</p>
                      {[
                        {title:"Fuga de agua",status:"En progreso",dot:"bg-amber-400",bg:"bg-amber-50",fg:"text-amber-600"},
                        {title:"Asamblea 25 Abr",status:"Urgente",dot:"bg-red-400",bg:"bg-red-50",fg:"text-red-600"},
                        {title:"Cuota marzo",status:"Pagado",dot:"bg-emerald-400",bg:"bg-emerald-50",fg:"text-emerald-600"},
                      ].map((item) => (
                        <div key={item.title} className="flex items-center gap-3 py-2.5 border-b border-[#F8FAFC] last:border-0">
                          <div className={`h-2 w-2 rounded-full ${item.dot}`} />
                          <p className="flex-1 text-[13px] font-medium text-[#0F172A] truncate">{item.title}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.bg} ${item.fg}`}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating cards */}
                <div className="absolute -left-16 top-20 hidden lg:block hero-card-float hero-card-float-d1 float-gentle">
                  <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-black/[0.04] p-4 w-48">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-lg bg-[#DCFCE7] flex items-center justify-center">
                        <svg className="h-3.5 w-3.5 text-[#16A34A]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                      </div>
                      <span className="text-[11px] font-semibold text-[#16A34A]">Pago confirmado</span>
                    </div>
                    <p className="text-[20px] font-extrabold text-[#0F172A]" style={{fontFamily:'Outfit,sans-serif'}}>$85.00</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">Cuota abril — Apto 1-A</p>
                  </div>
                </div>

                <div className="absolute -right-12 bottom-32 hidden lg:block hero-card-float hero-card-float-d2 float-gentle-d1">
                  <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-black/[0.04] p-4 w-52">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-lg bg-[#F0FDFA] flex items-center justify-center">
                        <svg className="h-3.5 w-3.5 text-[#0D9488]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z"/></svg>
                      </div>
                      <span className="text-[11px] font-semibold text-[#0D9488]">Visitante verificado</span>
                    </div>
                    <p className="text-[13px] font-bold text-[#0F172A]">Maria Garcia</p>
                    <p className="text-[11px] text-[#94A3B8]">V-18.456.789 → Apto 1-A</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PROBLEM ═══ */}
      <section id="problema" className="py-20 md:py-28 bg-[#0F172A] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(#fff 1px, transparent 1px)',backgroundSize:'32px 32px'}} aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="max-w-3xl">
              <span className="text-[12px] font-bold text-[#F87171] uppercase tracking-[0.2em]">El problema real</span>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em]" style={{fontFamily:'Outfit,sans-serif'}}>
                Tu condominio funciona con un grupo de WhatsApp, una planilla de Excel y mucha desconfianza.
              </h2>
              <p className="mt-6 text-[18px] text-[#94A3B8] leading-relaxed max-w-2xl">
                Nadie sabe a donde va el dinero. Los reportes de mantenimiento se pierden. Las visitas son un caos en la puerta. Y la junta esta agotada de hacer todo manual.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {[
              { number: "73%", text: "de residentes en Latam no confian en como se administra su condominio", icon: "🔒" },
              { number: "45min", text: "promedio diario que gasta un admin respondiendo en WhatsApp", icon: "⏱️" },
              { number: "15-40%", text: "de morosidad promedio en condominios sin sistema digital", icon: "📉" },
            ].map((stat, i) => (
              <Reveal key={stat.number} delay={i * 120}>
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-6 hover-lift">
                  <span className="text-3xl mb-3 block" aria-hidden="true">{stat.icon}</span>
                  <p className="text-[32px] font-extrabold text-[#F87171]" style={{fontFamily:'Outfit,sans-serif'}}>{stat.number}</p>
                  <p className="mt-2 text-[14px] text-[#94A3B8] leading-relaxed">{stat.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOLUTION — alternating feature sections ═══ */}
      <section id="solucion" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="text-center mb-16 md:mb-24">
              <span className="text-[12px] font-bold text-[#0D9488] uppercase tracking-[0.2em]">La solucion</span>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#0F172A]" style={{fontFamily:'Outfit,sans-serif'}}>
                Todo lo que tu condominio necesita.<br className="hidden md:block"/> Nada que no necesite.
              </h2>
            </div>
          </Reveal>

          {/* F1: Payments */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center mb-24 md:mb-32">
            <Reveal>
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#0D9488] mb-5">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>
                </div>
                <h3 className="text-[28px] md:text-[32px] font-extrabold text-[#0F172A] leading-tight tracking-[-0.02em]" style={{fontFamily:'Outfit,sans-serif'}}>
                  Cobrar dejo de ser un dolor de cabeza
                </h3>
                <p className="mt-4 text-[16px] text-[#64748B] leading-relaxed">
                  Cada residente ve cuanto debe, con desglose. Paga con Pago Movil, Zelle o transferencia. Sube el comprobante. El admin recibe notificacion. La morosidad baja sin perseguir a nadie.
                </p>
                <ul className="mt-6 space-y-3" role="list">
                  {["Estado de cuenta siempre actualizado","Recordatorio automatico pre-vencimiento","Comprobante con foto del pago","Admin ve quien pago y quien no en tiempo real"].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#475569]">
                      <svg className="h-5 w-5 text-[#0D9488] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="bg-[#F8FAFC] rounded-3xl p-8 md:p-10 border border-[#E2E8F0]">
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] hover-lift">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[13px] font-bold text-[#0F172A]">Cuota Abril 2026</p>
                        <p className="text-[11px] text-[#94A3B8]">Vence 15 de abril</p>
                      </div>
                      <span className="text-[11px] font-bold text-[#F59E0B] bg-[#FEF3C7] px-2.5 py-1 rounded-full">Pendiente</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-[32px] font-extrabold text-[#0F172A]" style={{fontFamily:'Outfit,sans-serif'}}>$85<span className="text-[18px] text-[#94A3B8]">.00</span></p>
                      <span className="bg-[#0F172A] text-white text-[12px] font-bold px-5 py-2.5 rounded-xl">Pagar ahora</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] opacity-60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-bold text-[#0F172A]">Cuota Marzo 2026</p>
                        <p className="text-[11px] text-[#94A3B8]">Pagado 10 de marzo</p>
                      </div>
                      <span className="text-[11px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded-full">Pagado</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* F2: Maintenance — reversed */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center mb-24 md:mb-32">
            <Reveal className="md:order-2">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706] mb-5">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.024a.75.75 0 01-1.089-.65V5.462a2.25 2.25 0 011.636-2.169l3.926-1.099A2.25 2.25 0 0112 4.386v.924m0 0a2.25 2.25 0 00-.875.179L9.75 6m2.25-1.312L14.4 5.55a2.25 2.25 0 01.875.179V21m0 0a2.25 2.25 0 01-2.25 0M15 21V5.73"/></svg>
                </div>
                <h3 className="text-[28px] md:text-[32px] font-extrabold text-[#0F172A] leading-tight tracking-[-0.02em]" style={{fontFamily:'Outfit,sans-serif'}}>
                  &ldquo;Lo reporte hace 3 meses y nadie hizo nada&rdquo; — nunca mas
                </h3>
                <p className="mt-4 text-[16px] text-[#64748B] leading-relaxed">
                  El residente toma foto, describe el problema y envia. El admin asigna responsable. Cada cambio de status genera notificacion. Nadie puede decir &ldquo;no sabia&rdquo;.
                </p>
                <ul className="mt-6 space-y-3" role="list">
                  {["Reporte con fotos del problema","Tracking visual: nuevo → en revision → resuelto","Notificacion automatica en cada cambio","Historial completo auditable"].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#475569]">
                      <svg className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={150} className="md:order-1">
              <div className="bg-[#FFFBEB] rounded-3xl p-8 md:p-10 border border-[#FEF3C7]">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] hover-lift">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0" aria-hidden="true">📸</div>
                    <div>
                      <p className="text-[14px] font-bold text-[#0F172A]">Fuga de agua — Bano piso 1</p>
                      <p className="text-[11px] text-[#94A3B8]">Reportado hace 2 dias por Rafael M.</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mb-3" role="progressbar" aria-valuenow={75} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de solicitud">
                    <div className="h-1.5 flex-1 rounded-full bg-[#0F172A]"/>
                    <div className="h-1.5 flex-1 rounded-full bg-[#0F172A]"/>
                    <div className="h-1.5 flex-1 rounded-full bg-[#F59E0B]"/>
                    <div className="h-1.5 flex-1 rounded-full bg-[#E2E8F0]"/>
                  </div>
                  <div className="flex justify-between text-[10px] text-[#94A3B8]">
                    <span className="font-semibold text-[#0F172A]">Nuevo</span>
                    <span className="font-semibold text-[#0F172A]">Revision</span>
                    <span className="font-semibold text-[#F59E0B]">En progreso</span>
                    <span>Resuelto</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#0D9488] text-white text-[9px] font-bold flex items-center justify-center" aria-hidden="true">JP</div>
                      <span className="text-[11px] text-[#64748B]">Asignado a Juan Plomero</span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#F59E0B]">En progreso</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* F3: QR */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center mb-24 md:mb-32">
            <Reveal>
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED] mb-5">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z"/></svg>
                </div>
                <h3 className="text-[28px] md:text-[32px] font-extrabold text-[#0F172A] leading-tight tracking-[-0.02em]" style={{fontFamily:'Outfit,sans-serif'}}>
                  Tus visitantes entran con un QR, no con una llamada
                </h3>
                <p className="mt-4 text-[16px] text-[#64748B] leading-relaxed">
                  Ingresa nombre y cedula de tu visitante. Le llega un QR por WhatsApp. El vigilante lo escanea y tiene todo: nombre, cedula, apartamento. Sin llamadas, sin esperas.
                </p>
                <ul className="mt-6 space-y-3" role="list">
                  {["QR generado en segundos, enviado por WhatsApp","Vigilante escanea y verifica identidad al instante","Registro automatico de cada acceso","Notificacion cuando tu visitante llega"].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#475569]">
                      <svg className="h-5 w-5 text-[#7C3AED] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="bg-[#FAF5FF] rounded-3xl p-8 md:p-10 border border-[#EDE9FE] flex items-center justify-center">
                <div className="w-full max-w-[260px]">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/[0.04] text-center hover-lift">
                    <div className="mx-auto w-36 h-36 bg-[#FAF5FF] rounded-2xl border-2 border-dashed border-[#C4B5FD] flex items-center justify-center mb-4" aria-label="Codigo QR de visitante">
                      <div className="grid grid-cols-5 gap-1">
                        {Array.from({length:25}).map((_,i) => (
                          <div key={i} className={`h-4 w-4 rounded-[3px] ${[0,1,2,4,5,6,8,10,12,14,16,18,20,22,23,24].includes(i)?"bg-[#0F172A]":"bg-[#F8FAFC]"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-[14px] font-bold text-[#0F172A]">Maria Garcia Lopez</p>
                    <p className="text-[12px] text-[#94A3B8] mt-0.5">V-18.456.789</p>
                    <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#16A34A] font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]"/>
                        Pase valido — Apto 1-A
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* F4: Transparency — reversed */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            <Reveal className="md:order-2">
              <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#16A34A] mb-5">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <h3 className="text-[28px] md:text-[32px] font-extrabold text-[#0F172A] leading-tight tracking-[-0.02em]" style={{fontFamily:'Outfit,sans-serif'}}>
                  &ldquo;A donde va mi dinero?&rdquo; — ahora lo puedes ver
                </h3>
                <p className="mt-4 text-[16px] text-[#64748B] leading-relaxed">
                  Cada residente ve ingresos y gastos del condominio. Cada gasto tiene recibo. Reporte mensual automatico en PDF listo para la asamblea. Cero opacidad.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3">
                  <svg className="h-5 w-5 text-[#16A34A]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
                  <span className="text-[13px] font-semibold text-[#16A34A]">Reduce morosidad hasta 30%</span>
                </div>
              </div>
            </Reveal>
            <Reveal delay={150} className="md:order-1">
              <div className="bg-[#F0FDF4] rounded-3xl p-8 md:p-10 border border-[#BBF7D0]">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] hover-lift">
                  <p className="text-[13px] font-bold text-[#0F172A] mb-4" style={{fontFamily:'Outfit,sans-serif'}}>Finanzas — Marzo 2026</p>
                  <div className="space-y-0">
                    {[
                      {label:"Cuotas recaudadas",amount:"+$510.00",color:"text-[#16A34A]"},
                      {label:"Limpieza mensual",amount:"-$200.00",color:"text-[#EF4444]"},
                      {label:"Vigilancia",amount:"-$450.00",color:"text-[#EF4444]"},
                      {label:"Reparacion bomba",amount:"-$350.00",color:"text-[#EF4444]"},
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-[#F1F5F9]">
                        <span className="text-[13px] text-[#64748B]">{row.label}</span>
                        <span className={`text-[14px] font-bold ${row.color}`}>{row.amount}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-3">
                      <span className="text-[14px] font-bold text-[#0F172A]">Balance</span>
                      <span className="text-[16px] font-extrabold text-[#0F172A]" style={{fontFamily:'Outfit,sans-serif'}}>-$490.00</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center text-[12px] font-semibold text-[#0D9488] bg-[#F0FDFA] rounded-xl py-2.5 border border-[#99F6E4]">
                    Descargar PDF del mes
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="precio" className="py-20 md:py-28 bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <div className="text-center mb-14">
              <span className="text-[12px] font-bold text-[#0D9488] uppercase tracking-[0.2em]">Precio</span>
              <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.02em] text-[#0F172A]" style={{fontFamily:'Outfit,sans-serif'}}>
                Empieza gratis. Crece sin limites.
              </h2>
              <p className="mt-3 text-[16px] text-[#64748B]">Sin setup. Sin contrato. Cancela cuando quieras.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            <Reveal>
              <div className="rounded-2xl bg-white border border-[#E2E8F0] p-7 hover-lift h-full">
                <p className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Starter</p>
                <p className="mt-3 text-[40px] font-extrabold text-[#0F172A]" style={{fontFamily:'Outfit,sans-serif'}}>Gratis</p>
                <p className="text-[13px] text-[#94A3B8] mt-1">Hasta 15 unidades, para siempre</p>
                <Link href="/login" className="mt-6 w-full py-3 rounded-xl border-2 border-[#E2E8F0] text-[13px] font-semibold text-[#0F172A] hover:border-[#CBD5E1] transition-colors btn-press flex items-center justify-center">
                  Crear cuenta gratis
                </Link>
                <div className="mt-6 pt-6 border-t border-[#F1F5F9] space-y-3">
                  {["Pagos y estado de cuenta","Mantenimiento con tracking","Comunicados oficiales","QR para visitantes"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[13px] text-[#475569]">
                      <svg className="h-4 w-4 text-[#0D9488] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="rounded-2xl bg-[#0F172A] text-white p-7 relative shadow-[0_20px_60px_rgba(15,23,42,0.2)] hover-lift h-full">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2DD4BF] text-[#042F2E] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider badge-pop badge-pop-d1">Popular</div>
                <p className="text-[12px] font-bold text-[#2DD4BF] uppercase tracking-wider">Pro</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-[40px] font-extrabold" style={{fontFamily:'Outfit,sans-serif'}}>$2.50</span>
                  <span className="text-[14px] text-[#94A3B8]">/ud/mes</span>
                </div>
                <p className="text-[13px] text-[#94A3B8] mt-1">Todo incluido</p>
                <Link href="/login" className="mt-6 w-full py-3 rounded-xl bg-[#2DD4BF] text-[#042F2E] text-[13px] font-bold hover:bg-[#5EEAD4] transition-colors btn-press flex items-center justify-center">
                  Iniciar prueba gratis
                </Link>
                <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                  {["Todo de Starter","Transparencia financiera","Reserva de areas comunes","Multi-moneda Bs + USD","Reportes PDF automaticos","Unidades ilimitadas"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[13px] text-[#CBD5E1]">
                      <svg className="h-4 w-4 text-[#2DD4BF] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={240}>
              <div className="rounded-2xl bg-white border border-[#E2E8F0] p-7 hover-lift h-full">
                <p className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Business</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-[40px] font-extrabold text-[#0F172A]" style={{fontFamily:'Outfit,sans-serif'}}>$3.50</span>
                  <span className="text-[14px] text-[#94A3B8]">/ud/mes</span>
                </div>
                <p className="text-[13px] text-[#94A3B8] mt-1">Administradoras profesionales</p>
                <Link href="/login" className="mt-6 w-full py-3 rounded-xl border-2 border-[#E2E8F0] text-[13px] font-semibold text-[#0F172A] hover:border-[#CBD5E1] transition-colors btn-press flex items-center justify-center">
                  Contactar ventas
                </Link>
                <div className="mt-6 pt-6 border-t border-[#F1F5F9] space-y-3">
                  {["Todo de Pro","Votaciones digitales","WhatsApp Business API","SLAs y escalamiento","Soporte prioritario","Multi-propiedad"].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[13px] text-[#475569]">
                      <svg className="h-4 w-4 text-[#0D9488] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <Reveal>
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-4xl px-5 md:px-8 text-center">
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#0F172A]" style={{fontFamily:'Outfit,sans-serif'}}>
              Dale a tu condominio<br/>la app que se merece.
            </h2>
            <p className="mt-5 text-[17px] text-[#64748B] max-w-lg mx-auto">
              2 minutos para registrarte. Sin tarjeta. Sin contrato. Gratis hasta 15 unidades.
            </p>
            <div className="mt-10">
              <Link href="/login" className="group bg-[#0F172A] text-white text-[16px] font-bold pl-8 pr-6 py-5 rounded-2xl hover:bg-[#1E293B] transition-all duration-300 inline-flex items-center gap-4 shadow-[0_8px_32px_rgba(15,23,42,0.18)] hover:shadow-[0_12px_48px_rgba(15,23,42,0.24)] hover:-translate-y-1 btn-press" style={{fontFamily:'Outfit,sans-serif'}}>
                Empezar gratis ahora
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 group-hover:bg-white/20 transition-colors duration-200">
                  <svg className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"/></svg>
                </span>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-[#F1F5F9] py-10">
        <div className="mx-auto max-w-7xl px-5 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#0F172A] flex items-center justify-center" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2DD4BF]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-[14px] font-bold text-[#0F172A]" style={{fontFamily:'Outfit,sans-serif'}}>condoapp</span>
          </div>
          <p className="text-[13px] text-[#94A3B8]">
            Hecho por{" "}
            <a href="https://tuwebgo.net" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#0D9488] hover:underline transition-colors">
              tuwebgo.net
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
            name: "CondoApp",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: "App de gestion de condominios para Latinoamerica. Pagos, mantenimiento, acceso QR, transparencia financiera.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: "Gratis hasta 15 unidades",
            },
            creator: {
              "@type": "Organization",
              name: "tuwebgo.net",
              url: "https://tuwebgo.net",
            },
          }),
        }}
      />
    </div>
  );
}
