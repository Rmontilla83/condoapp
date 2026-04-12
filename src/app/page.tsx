import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Paga en 2 toques",
    description:
      "Estado de cuenta claro. Pago movil, Zelle o transferencia. Comprobante instantaneo. Recordatorio automatico antes del vencimiento.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    color: "from-teal-500/20 to-emerald-500/20",
    iconColor: "text-teal-600",
  },
  {
    title: "Reporta con foto",
    description:
      "Toma foto del problema, describe, envia. Ve el progreso en tiempo real: nuevo, en revision, en progreso, resuelto.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
    color: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-600",
  },
  {
    title: "Transparencia total",
    description:
      "Ve exactamente en que se gasta cada bolivar. Ingresos, gastos con recibo, reporte mensual automatico exportable a PDF.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    color: "from-emerald-500/20 to-green-500/20",
    iconColor: "text-emerald-600",
  },
  {
    title: "Acceso QR para visitantes",
    description:
      "Genera un QR con nombre y cedula de tu visitante. El vigilante lo escanea y tiene toda la info al instante. Sin llamadas.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 14.625v1.5a1.125 1.125 0 001.125 1.125h1.5m0 0v2.625m0-2.625h2.625m-2.625 0h-1.5" />
      </svg>
    ),
    color: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-600",
  },
  {
    title: "Comunicados oficiales",
    description:
      "Adios al caos del grupo de WhatsApp. Canal oficial con avisos por prioridad y notificaciones que si puedes controlar.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59" />
      </svg>
    ),
    color: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-600",
  },
  {
    title: "Reserva areas comunes",
    description:
      "Salon, piscina, gym, BBQ — reserva en 2 toques con calendario visual. Disponibilidad en tiempo real, sin conflictos.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    color: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-600",
  },
];

const stats = [
  { value: "2", label: "toques para pagar", suffix: "" },
  { value: "30", label: "menos morosidad", suffix: "%" },
  { value: "0", label: "contrasenas", suffix: "" },
  { value: "24/7", label: "acceso total", suffix: "" },
];

const steps = [
  {
    step: "01",
    title: "Registra tu condominio",
    description: "El administrador crea el condominio en 2 minutos. Sin contratos, sin setup fee.",
  },
  {
    step: "02",
    title: "Invita a los residentes",
    description: "Comparte un enlace por WhatsApp. Los residentes entran con su correo, sin contrasena.",
  },
  {
    step: "03",
    title: "Todo funciona",
    description: "Pagos, reportes, comunicados, acceso QR — todo desde el celular. Automatico.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-mesh-hero relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-teal-500/8 blur-3xl animate-glow-pulse" />
        <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-amber-500/6 blur-3xl animate-glow-pulse delay-700" />
      </div>

      {/* Nav */}
      <header className="relative z-10 glass border-b border-white/10">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-base shadow-lg shadow-teal-500/25">
              C
            </div>
            <span className="text-xl font-bold font-heading tracking-tight">
              Condo<span className="text-gradient">App</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funciones</a>
            <a href="#how" className="hover:text-foreground transition-colors">Como funciona</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Precios</a>
          </nav>
          <Link href="/login">
            <Button className="rounded-full px-6 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5">
              Iniciar sesion
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 md:px-8 pt-20 pb-24 md:pt-32 md:pb-36">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2.5 rounded-full border border-teal-200/50 bg-teal-50/80 px-5 py-2 text-sm font-medium text-teal-700 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500" />
            </span>
            Gestion de condominios reinventada
          </div>

          <h1 className="animate-fade-in-up delay-100 font-heading text-5xl font-extrabold tracking-tight leading-[1.1] md:text-7xl lg:text-8xl">
            Tu condominio,{" "}
            <span className="text-gradient">
              mas inteligente
            </span>
          </h1>

          <p className="animate-fade-in-up delay-200 mt-7 text-lg text-muted-foreground md:text-xl leading-relaxed max-w-2xl mx-auto">
            Paga en 2 toques. Reporta con foto. Genera QR para tus visitantes.
            Transparencia total de las finanzas. Todo desde tu celular.
          </p>

          <div className="animate-fade-in-up delay-300 mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/login">
              <Button
                size="lg"
                className="rounded-full text-base px-10 py-6 font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500"
              >
                Empezar gratis
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Button>
            </Link>
            <a href="#how">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full text-base px-10 py-6 font-semibold border-2 hover:bg-muted/50 transition-all duration-300"
              >
                Ver como funciona
              </Button>
            </a>
          </div>

          <p className="animate-fade-in-up delay-400 mt-5 text-sm text-muted-foreground">
            Gratis hasta 15 unidades. Sin tarjeta de credito. Sin contratos.
          </p>
        </div>

        {/* Stats bar */}
        <div className="animate-fade-in-up delay-500 mt-20 mx-auto max-w-3xl">
          <div className="glass rounded-2xl p-1 shadow-xl shadow-black/5">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border/50">
              {stats.map((stat) => (
                <div key={stat.label} className="px-6 py-5 text-center">
                  <div className="font-heading text-3xl font-extrabold text-foreground">
                    {stat.value}
                    <span className="text-gradient">{stat.suffix}</span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="relative z-10 border-y bg-muted/30 py-10">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-center text-sm font-medium text-muted-foreground tracking-wide">
            DISEÑADO PARA CONDOMINIOS EN VENEZUELA Y TODA LATINOAMERICA
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-muted-foreground/40">
            <span className="font-heading text-2xl font-bold">Caracas</span>
            <span className="font-heading text-2xl font-bold">Bogota</span>
            <span className="font-heading text-2xl font-bold">CDMX</span>
            <span className="font-heading text-2xl font-bold">Santiago</span>
            <span className="font-heading text-2xl font-bold">Lima</span>
            <span className="font-heading text-2xl font-bold">Panama</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              Funciones
            </span>
            <h2 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
              Todo lo que tu condominio necesita
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Sin complejidad. Sin curva de aprendizaje. Si sabes usar WhatsApp, sabes usar CondoApp.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, idx) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border bg-card p-7 transition-all duration-500 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 hover:border-primary/20"
              >
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} ${feature.iconColor} transition-transform duration-500 group-hover:scale-110`}>
                  {feature.icon}
                </div>
                <h3 className="font-heading text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 py-24 md:py-32 bg-gradient-to-b from-muted/50 to-background">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-primary uppercase tracking-widest mb-3">
              Como funciona
            </span>
            <h2 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
              Listo en 3 pasos
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Tu condominio operando de forma digital en menos de 5 minutos.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, idx) => (
              <div key={step.step} className="relative text-center md:text-left">
                <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-heading text-xl font-extrabold shadow-lg shadow-teal-500/20">
                  {step.step}
                </div>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-primary/30 to-transparent" />
                )}
                <h3 className="font-heading text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-[15px] text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QR Feature highlight */}
      <section className="relative z-10 py-24 md:py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div>
              <span className="inline-block text-sm font-semibold text-violet-600 uppercase tracking-widest mb-3">
                Nuevo
              </span>
              <h2 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl mb-6">
                Acceso QR para{" "}
                <span className="text-gradient">visitantes</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Tu visitante recibe un QR por WhatsApp. Llega a la puerta, el vigilante lo escanea y tiene nombre, cedula y apartamento al instante. Sin llamadas, sin esperas, sin papel.
              </p>
              <div className="space-y-4">
                {[
                  "Propietario ingresa nombre y cedula del visitante",
                  "QR se genera y se envia por WhatsApp automaticamente",
                  "Vigilante escanea, verifica cedula y da acceso",
                  "Propietario recibe notificacion cuando su visitante ingresa",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-sm font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <span className="text-[15px] leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative flex items-center justify-center">
              <div className="relative w-72 h-72 md:w-80 md:h-80">
                {/* QR visual */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-100 to-teal-50 border-2 border-violet-200/50 shadow-2xl shadow-violet-500/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 grid grid-cols-5 gap-1.5 w-32">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-5 w-5 rounded-sm ${
                            [0,1,2,4,5,6,8,10,12,14,16,18,20,22,23,24].includes(i)
                              ? "bg-foreground/80"
                              : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-bold text-foreground">QR Visitante</p>
                    <p className="text-xs text-muted-foreground mt-1">Valido por 24 horas</p>
                  </div>
                </div>
                {/* Floating badge */}
                <div className="absolute -top-4 -right-4 glass rounded-xl px-4 py-2.5 shadow-lg animate-float">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold">Acceso verificado</span>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 glass rounded-xl px-4 py-2.5 shadow-lg animate-float delay-300">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <span className="text-xs font-semibold">Seguridad garantizada</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transparency section */}
      <section className="relative z-10 py-24 md:py-32 bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-mesh-dark" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-5 md:px-8 text-center">
          <span className="inline-block text-sm font-semibold text-teal-400 uppercase tracking-widest mb-3">
            El killer feature
          </span>
          <h2 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl text-white mb-6">
            Transparencia financiera total
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed">
            La queja #1 en condominios de Latinoamerica: "A donde va mi dinero?"
            Con CondoApp, cada residente ve cada ingreso y cada gasto. Con recibo. Sin excusas.
          </p>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { icon: "chart", title: "Ingresos vs gastos", desc: "Dashboard en tiempo real visible para todos los residentes" },
              { icon: "receipt", title: "Cada gasto documentado", desc: "Foto de factura adjunta a cada gasto. Auditoria permanente" },
              { icon: "pdf", title: "Reporte mensual PDF", desc: "Auto-generado, exportable, listo para la asamblea. Ahorra horas" },
            ].map((item) => (
              <div key={item.title} className="glass-dark rounded-2xl p-6 text-left">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
                  {item.icon === "chart" && (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  )}
                  {item.icon === "receipt" && (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  )}
                  {item.icon === "pdf" && (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  )}
                </div>
                <h3 className="font-heading text-lg font-bold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="relative z-10 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8 text-center">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            Precios
          </span>
          <h2 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl mb-4">
            Empieza gratis, crece sin limites
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-12">
            Sin setup fee. Sin contrato anual. Cancela cuando quieras.
          </p>

          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border-2 border-border bg-card p-8 text-left">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Starter</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-heading text-5xl font-extrabold">$0</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Hasta 15 unidades, gratis para siempre</p>
              <Link href="/login">
                <Button variant="outline" className="w-full rounded-full font-semibold">Empezar gratis</Button>
              </Link>
              <ul className="mt-6 space-y-3 text-sm">
                {["Pagos y estado de cuenta", "Mantenimiento con tracking", "Comunicados", "QR visitantes", "1 condominio"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro — highlighted */}
            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 text-left shadow-xl shadow-primary/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-1 text-xs font-bold text-white shadow-lg">
                POPULAR
              </div>
              <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Pro</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-heading text-5xl font-extrabold">$2.50</span>
                <span className="text-muted-foreground text-sm">/unidad/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Para condominios que quieren todo</p>
              <Link href="/login">
                <Button className="w-full rounded-full font-semibold shadow-lg shadow-primary/25">Empezar prueba gratis</Button>
              </Link>
              <ul className="mt-6 space-y-3 text-sm">
                {["Todo del plan Starter", "Transparencia financiera", "Reserva de areas comunes", "Multi-moneda (Bs + USD)", "Reportes PDF automaticos", "Unidades ilimitadas"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Business */}
            <div className="rounded-2xl border-2 border-border bg-card p-8 text-left">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Business</div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-heading text-5xl font-extrabold">$3.50</span>
                <span className="text-muted-foreground text-sm">/unidad/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">Para grandes condominios y administradoras</p>
              <Link href="/login">
                <Button variant="outline" className="w-full rounded-full font-semibold">Contactar ventas</Button>
              </Link>
              <ul className="mt-6 space-y-3 text-sm">
                {["Todo del plan Pro", "Votaciones digitales", "SLAs y escalamiento", "WhatsApp Business API", "Soporte prioritario", "Multi-propiedad"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 md:p-20 text-center text-white overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-1/3 h-48 w-48 rounded-full bg-teal-400 blur-3xl" />
              <div className="absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-amber-400 blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl text-white mb-4">
                Tu condominio merece algo mejor
              </h2>
              <p className="text-lg text-slate-300 max-w-xl mx-auto mb-10">
                Unete a los condominios que ya dejaron el caos de WhatsApp y las planillas de Excel.
              </p>
              <Link href="/login">
                <Button
                  size="lg"
                  className="rounded-full text-base px-12 py-6 font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-2xl transition-all duration-300 hover:-translate-y-1"
                >
                  Empezar gratis ahora
                  <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t py-12">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-sm shadow-md">
                C
              </div>
              <span className="text-lg font-bold font-heading">CondoApp</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Gestion de condominios simple, transparente e inteligente.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
