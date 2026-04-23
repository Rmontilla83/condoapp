import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F2E5A",
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
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        {/*
          SW cleanup AGRESIVO (beforeInteractive).
          Si detecta un SW registrado, lo desinstala, borra TODOS los
          caches, y fuerza reload con bypass de caché. Sin esto los
          browsers que tenían el SW viejo seguían sirviendo HTML stale
          aunque hiciéramos router.refresh() o location.reload() normal.
          Guard con sessionStorage para no caer en loop infinito de reload.
        */}
        <Script id="sw-kill" strategy="beforeInteractive">
          {`(function(){
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (sessionStorage.getItem('__atryum_sw_killed')) return;
  navigator.serviceWorker.getRegistrations().then(function(regs){
    if (!regs.length) return;
    sessionStorage.setItem('__atryum_sw_killed','1');
    Promise.all(regs.map(function(r){return r.unregister();})).then(function(){
      if ('caches' in window) {
        caches.keys().then(function(keys){
          Promise.all(keys.map(function(k){return caches.delete(k);})).then(function(){
            window.location.reload();
          });
        });
      } else {
        window.location.reload();
      }
    });
  }).catch(function(){});
})();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
