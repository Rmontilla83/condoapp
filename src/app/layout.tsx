import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D9488",
};

export const metadata: Metadata = {
  title: "CondoApp — Gestion de Condominios Inteligente | Pagos, QR, Transparencia",
  description:
    "App de gestion de condominios para Latinoamerica. Pagos en 2 toques, reportes con foto, acceso QR para visitantes, transparencia financiera total. Gratis hasta 15 unidades.",
  keywords: [
    "gestion condominios",
    "app condominios",
    "administracion condominios",
    "pagos condominio",
    "mantenimiento condominio",
    "control acceso QR",
    "transparencia financiera condominio",
    "condominio Venezuela",
    "condominio Latinoamerica",
  ],
  authors: [{ name: "CondoApp" }],
  creator: "tuwebgo.net",
  openGraph: {
    type: "website",
    locale: "es_LA",
    siteName: "CondoApp",
    title: "CondoApp — La app que tu condominio merece",
    description:
      "Pagos en 2 toques. Reportes con foto. Acceso QR para visitantes. Transparencia total. Gratis hasta 15 unidades.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CondoApp — Gestion de Condominios Inteligente",
    description:
      "Pagos, mantenimiento, acceso QR y transparencia financiera. Todo desde tu celular.",
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
    <html lang="es" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
