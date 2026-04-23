import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0E1116",
  colorScheme: "light",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atryum.net";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Atryum — Un átrium dentro de cada A",
    template: "%s · Atryum",
  },
  description:
    "Atryum reúne acceso, comunidad y administración del condominio en una sola app. Pagos, mantenimiento, QR de visitantes y transparencia financiera.",
  keywords: [
    "gestion condominios",
    "app condominios",
    "proptech",
    "administracion condominios",
    "pagos condominio",
    "control acceso QR",
    "transparencia financiera condominio",
    "condominio Latinoamerica",
    "condominio Venezuela",
  ],
  authors: [{ name: "Atryum" }],
  creator: "Atryum",
  alternates: {
    canonical: SITE_URL,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Atryum",
  },
  openGraph: {
    type: "website",
    locale: "es_LA",
    url: SITE_URL,
    siteName: "Atryum",
    title: "Atryum — Un átrium dentro de cada A",
    description:
      "Acceso, comunidad y administración en una sola app. Operativo en menos de una semana, sin obra ni cableado.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atryum — Un átrium dentro de cada A",
    description:
      "Acceso, comunidad y administración del condominio en una sola app.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        {children}
        {/*
          SW registration desactivado. El SW viejo cacheaba HTML/RSC y
          rompía router.refresh(). Cargamos igual /sw.js porque los
          browsers que lo tenían registrado lo consultan en cada navegación;
          la nueva versión se auto-desinstala (ver public/sw.js).
        */}
        <Script id="sw-cleanup" strategy="afterInteractive">
          {`if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()))}`}
        </Script>
      </body>
    </html>
  );
}
