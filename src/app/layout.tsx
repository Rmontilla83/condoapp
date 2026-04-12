import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CondoApp — Gestión de Condominios Inteligente",
  description: "Paga en 2 toques. Reporta con foto. Transparencia total. Todo lo que necesitas para vivir mejor en comunidad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
