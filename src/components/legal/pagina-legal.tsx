import Link from "next/link";
import { AtryumLogo } from "@/components/brand/atryum-logo";
import { VIGENCIA_CONDICIONES } from "@/lib/legal";

/** Marco de las páginas públicas de condiciones y privacidad. */
export function PaginaLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-marine-deep/10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-5">
          <Link href="/" aria-label="Atryum">
            <AtryumLogo variant="horizontal" tone="color" className="text-[18px]" />
          </Link>
          <nav className="flex gap-4 text-[14px] text-mute" aria-label="Documentos legales">
            <Link href="/terminos" className="hover:text-marine-deep">Condiciones</Link>
            <Link href="/privacidad" className="hover:text-marine-deep">Privacidad</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.15] tracking-[-0.02em] text-marine-deep">{titulo}</h1>
        <p className="mt-2 text-[14px] text-mute">Vigente desde {VIGENCIA_CONDICIONES}.</p>
        <div className="mt-8 space-y-7 text-[15px] leading-relaxed text-marine-deep/90 [&_h2]:mb-2 [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:text-marine-deep [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </main>
    </div>
  );
}
