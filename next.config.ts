import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Default 1MB es insuficiente para uploads de fotos (mantenimiento, etc).
      // 15MB permite ~3 fotos de móvil moderno sin compresión.
      bodySizeLimit: "15mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=()" },
        ],
      },
      {
        // Forzar no-cache en HTML de páginas dinámicas del dashboard.
        // Evita que cualquier layer (CDN/Vercel edge/browser) sirva versión
        // stale después de una mutation. Los assets (_next/static) siguen
        // con su cache inmutable normal porque no matchea esta source.
        source: "/((?!_next|brand|icon|apple|favicon|manifest|sw|robots|sitemap).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
