import { TiltCard } from "@/components/ui/tilt-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";

/* ═══════════ WOW 1 · COBRANZA ═══════════ */
export function CobranzaVisual() {
  return (
    <TiltCard max={5} glare className="rounded-3xl bg-cloud/40 border border-border p-6 md:p-8">
      <div className="space-y-3">
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] font-medium text-marine-deep">Cuota Abril · APTO 1-A</p>
              <p className="font-meta text-mute mt-1">ALÍCUOTA 6.5% · BASE $1300</p>
            </div>
            <span className="font-meta text-marine-deep bg-cyan/15 border border-cyan/30 px-2.5 py-1 rounded-md">
              POR ALÍCUOTA
            </span>
          </div>
          <p className="font-display text-[44px] text-marine-deep leading-none tabular-nums">
            $<AnimatedCounter value={84.50} decimals={2} duration={1400} />
          </p>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-[12px] text-mute">3 facturas seleccionadas</span>
            <span className="bg-marine-deep text-frost text-[12px] font-medium px-4 py-2 rounded-lg">
              Subir 1 comprobante →
            </span>
          </div>
        </div>

        <div className="bg-ember/5 border border-ember/30 rounded-2xl p-4 flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-ember animate-pulse shrink-0" />
          <div className="flex-1">
            <p className="text-[12px] font-medium text-ember">EN REVISIÓN</p>
            <p className="text-[11px] text-mute">Comprobante recibido · admin notificado</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-3.5 border border-border opacity-65 flex items-center justify-between">
          <span className="text-[12px] text-mute">Cuota Marzo · pagado</span>
          <span className="font-meta text-cyan bg-cyan/10 px-2 py-0.5 rounded">PAGADO</span>
        </div>
      </div>
    </TiltCard>
  );
}

/* ═══════════ WOW 2 · IDENTITY STRIP ═══════════ */
export function IdentityVisual() {
  return (
    <TiltCard max={5} glare className="rounded-3xl bg-marine-deep text-frost p-6 md:p-8 grain shadow-[0_32px_80px_-20px_rgb(15,46,90,0.5)]">
      <div className="space-y-5">
        <div>
          <span className="font-meta-loose text-ember">DASHBOARD · BUENAS TARDES</span>
          <h4 className="mt-2 font-display text-[28px] text-frost">Hola, Rafael</h4>
        </div>

        <div className="bg-frost/8 border border-frost/15 rounded-xl px-4 py-3 backdrop-blur-sm flex items-center flex-wrap gap-2">
          <span className="font-meta-loose text-cyan">APTO 1-A</span>
          <span className="text-frost/30">·</span>
          <span className="font-meta-loose text-frost/80">BLOQUE A</span>
          <span className="text-frost/30">·</span>
          <span className="font-meta-loose text-frost/80">COSTA DE PLATA</span>
          <span className="text-frost/30">·</span>
          <span className="font-meta-loose text-ember">PROPIETARIO</span>
        </div>

        <div className="bg-destructive/15 border-l-4 border-destructive rounded-xl px-4 py-3">
          <p className="font-meta text-frost/70">URGENTE · HACE 2H</p>
          <p className="text-[13px] text-frost mt-1">Corte de agua mañana 9am · Mantenimiento bomba</p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-2">
          <div className="bg-frost/5 rounded-lg p-3">
            <p className="font-meta text-frost/50">PENDIENTE</p>
            <p className="mt-1 font-display text-xl text-frost">$84.50</p>
          </div>
          <div className="bg-frost/5 rounded-lg p-3">
            <p className="font-meta text-frost/50">RESERVA</p>
            <p className="mt-1 font-display text-xl text-frost">SAB 3</p>
          </div>
          <div className="bg-frost/5 rounded-lg p-3">
            <p className="font-meta text-frost/50">VOTANDO</p>
            <p className="mt-1 font-display text-xl text-ember">2</p>
          </div>
        </div>

        <div className="pt-3 flex items-center gap-2 bg-ember text-marine-deep rounded-xl px-4 py-3 font-medium text-[14px] cursor-pointer">
          <span className="text-lg">⚡</span>
          PAGAR $84.50 AHORA
        </div>
      </div>
    </TiltCard>
  );
}

/* ═══════════ WOW 3 · QR + WHATSAPP ═══════════ */
export function QrVisual() {
  return (
    <TiltCard max={5} glare className="rounded-3xl bg-cloud/40 border border-border p-6 md:p-8">
      <div className="space-y-4">
        {/* Visitor kind selector */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="font-meta text-mute mb-3">¿QUÉ TIPO DE VISITA?</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { e: "🚗", l: "Uber" },
              { e: "📦", l: "Delivery" },
              { e: "👨‍👩‍👧", l: "Familia", active: true },
              { e: "📦", l: "Mudanza" },
            ].map((k) => (
              <div
                key={k.l}
                className={`rounded-lg py-2.5 text-center transition-colors ${
                  k.active
                    ? "bg-marine-deep text-frost"
                    : "bg-cloud/50 text-mute"
                }`}
              >
                <div className="text-base">{k.e}</div>
                <div className="text-[10px] mt-1 font-meta">{k.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* QR card */}
        <div className="bg-marine-deep text-frost rounded-2xl p-5 grain">
          <div className="flex items-center justify-between mb-3">
            <span className="font-meta text-ember">PASE GENERADO</span>
            <span className="text-[10px] text-frost/60">VIGENTE 4H</span>
          </div>
          <div className="bg-frost rounded-xl p-4 mb-3">
            <div className="grid grid-cols-7 gap-0.5 mx-auto w-fit" role="img" aria-label="QR de visitante">
              {Array.from({ length: 49 }).map((_, i) => {
                const pattern = [0, 1, 2, 3, 4, 5, 6, 7, 13, 14, 20, 21, 27, 28, 29, 31, 32, 33, 34, 35, 36, 38, 41, 42, 43, 44, 47, 48];
                return (
                  <div
                    key={i}
                    className={`h-2.5 w-2.5 rounded-[1.5px] ${
                      pattern.includes(i) ? "bg-marine-deep" : "bg-cloud/20"
                    }`}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-center text-[13px] font-medium text-marine-deep">María García López</p>
            <p className="text-center font-meta text-mute mt-0.5">FAMILIA · APTO 1-A</p>
          </div>
        </div>

        {/* WhatsApp share button */}
        <div className="bg-[#25D366] text-white rounded-2xl px-5 py-4 flex items-center justify-center gap-3 font-medium text-[14px]">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.595 5.392l-.999 3.648 3.893-1.039z"/>
          </svg>
          Compartir por WhatsApp
        </div>
      </div>
    </TiltCard>
  );
}

/* ═══════════ WOW 4 · DECISIÓN PONDERADA ═══════════ */
export function DecisionVisual() {
  return (
    <TiltCard max={5} glare className="rounded-3xl bg-cloud/40 border border-border p-6 md:p-8">
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="font-meta text-marine-deep bg-marine-deep/10 border border-marine-deep/20 px-2 py-1 rounded-md">
            ASAMBLEA FORMAL
          </span>
          <span className="font-meta text-cyan bg-cyan/10 border border-cyan/30 px-2 py-1 rounded-md">
            VOTO PONDERADO
          </span>
        </div>
        <h4 className="font-display text-[20px] text-marine-deep leading-tight tracking-[-0.02em]">
          ¿Aprobar derrama techo $50.000?
        </h4>

        {/* Quórum bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-meta text-mute">QUÓRUM</span>
            <span className="font-meta text-marine-deep tabular-nums">
              <AnimatedCounter value={67.4} decimals={1} suffix="%" duration={1800} /> · REQUIERE 50% ✓
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-cloud overflow-hidden">
            <div className="h-full rounded-full bg-cyan transition-all duration-1000" style={{ width: "67.4%" }} />
          </div>
        </div>

        {/* Voting options */}
        <div className="mt-5 space-y-2.5">
          {[
            { label: "Sí, aprobar", pct: 52.3, color: "bg-cyan", aliquot: "52.3 / 100 alícuota" },
            { label: "No, rechazar", pct: 12.1, color: "bg-mute/40", aliquot: "12.1 / 100 alícuota" },
            { label: "Abstención", pct: 3.0, color: "bg-mute/30", aliquot: "3.0 / 100 alícuota" },
          ].map((opt) => (
            <div key={opt.label}>
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="font-medium text-marine-deep">{opt.label}</span>
                <span className="font-meta text-mute tabular-nums">{opt.aliquot}</span>
              </div>
              <div className="h-2 rounded-full bg-cloud overflow-hidden">
                <div className={`h-full rounded-full ${opt.color} transition-all duration-1000`} style={{ width: `${opt.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
          <span className="font-meta text-cyan">VOTASTE 1 DE 1 ✓</span>
          <span className="font-meta text-mute">CIERRA SAB 14 MAY</span>
        </div>
      </div>
    </TiltCard>
  );
}

/* ═══════════ WOW 5 · PRESUPUESTO EJECUTADO ═══════════ */
export function BudgetVisual() {
  return (
    <TiltCard max={5} glare className="rounded-3xl bg-cloud/40 border border-border p-6 md:p-8">
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
          <div>
            <p className="font-meta text-cyan">PRESUPUESTO 2026</p>
            <p className="text-[13px] font-medium text-marine-deep mt-1">Ejecutado vs aprobado</p>
          </div>
          <span className="font-meta text-cyan bg-cyan/10 border border-cyan/30 px-2.5 py-1 rounded-md">
            APROBADO
          </span>
        </div>
        <div className="space-y-4">
          {[
            { label: "Vigilancia", icon: "🛡️", exec: 1740, plan: 6960, pct: 25, tone: "bg-cyan" },
            { label: "Mantenimiento", icon: "🔧", exec: 4800, plan: 24000, pct: 20, tone: "bg-cyan" },
            { label: "Aseo", icon: "✨", exec: 4400, plan: 4800, pct: 91.6, tone: "bg-ember" },
            { label: "Servicios", icon: "⚡", exec: 6800, plan: 6000, pct: 113.3, tone: "bg-destructive" },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="font-medium text-marine-deep flex items-center gap-2">
                  <span className="text-base">{row.icon}</span>
                  {row.label}
                </span>
                <span className="font-meta text-mute tabular-nums">
                  ${row.exec.toLocaleString()} / ${row.plan.toLocaleString()}
                </span>
              </div>
              <div className="h-2 rounded-full bg-cloud overflow-hidden relative">
                <div
                  className={`h-full ${row.tone} transition-all duration-1000`}
                  style={{ width: `${Math.min(row.pct, 100)}%` }}
                />
              </div>
              <div className="text-right mt-0.5 font-meta text-mute tabular-nums">{row.pct.toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>
    </TiltCard>
  );
}

/* ═══════════ HOW IT WORKS · 3 STEPS VISUAL ═══════════ */
export function StepsVisual() {
  return (
    <div className="grid md:grid-cols-3 gap-5">
      {[
        {
          n: "01",
          icon: "✏️",
          title: "Registrá tu condominio",
          copy: "Nombre, dirección, número de unidades. 2 minutos.",
        },
        {
          n: "02",
          icon: "👥",
          title: "Invitá a los residentes",
          copy: "Por email o código físico. Ellos crean su cuenta solos.",
        },
        {
          n: "03",
          icon: "🚀",
          title: "Empezás a usar",
          copy: "Cuotas, comunicados, visitantes, votos. Todo desde el primer día.",
        },
      ].map((step) => (
        <div
          key={step.n}
          className="relative rounded-2xl bg-card border border-border p-6 hover-lift"
        >
          <div className="absolute top-6 right-6 font-display text-[40px] text-cyan/20 leading-none">
            {step.n}
          </div>
          <span className="text-3xl block mb-4" aria-hidden="true">{step.icon}</span>
          <h3 className="font-display text-[20px] text-marine-deep leading-tight tracking-[-0.02em]">
            {step.title}
          </h3>
          <p className="mt-2 text-[14px] text-mute leading-relaxed">{step.copy}</p>
        </div>
      ))}
    </div>
  );
}
