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
  async rewrites() {
    return [
      // Las guías se sirven desde `public/guias/*.html`, pero el link que se le
      // manda a un cliente no debería llevar extensión.
      { source: "/guias/:slug", destination: "/guias/:slug.html" },
    ];
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
        source: "/guias/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        // Forzar no-cache en HTML de páginas dinámicas del dashboard.
        // Evita que cualquier layer (CDN/Vercel edge/browser) sirva versión
        // stale después de una mutation. Los assets (_next/static) siguen
        // con su cache inmutable normal porque no matchea esta source.
        source: "/((?!_next|brand|guias|icon|apple|favicon|manifest|sw|robots|sitemap).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
