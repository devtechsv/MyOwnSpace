const crypto = require('crypto');
const { themeInitScript } = require('./src/lib/theme-init-script');

if (process.env.NODE_ENV === 'development') {
  // El certificado de desarrollo de OwnSpaceAPI es autofirmado — Node.js
  // (llamadas server-side desde getServerSideProps, vía
  // src/services/api-client.ts) no lo confía aunque el navegador sí lo
  // haga vía `dotnet dev-certs https --trust` (son mecanismos de
  // confianza TLS separados). Esto corre en el proceso de Node.js del
  // propio next.config.js — nunca se empaqueta para el navegador ni
  // afecta al build de producción.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const isDev = process.env.NODE_ENV === 'development';

function hashInlineScript(script) {
  return `'sha256-${crypto.createHash('sha256').update(script, 'utf8').digest('base64')}'`;
}

function buildContentSecurityPolicy() {
  // Único <script> inline de todo el proyecto (_document.tsx, evita el
  // parpadeo de tema) — se permite por hash en vez de 'unsafe-inline'
  // para no abrirle la puerta a cualquier script inyectado a futuro.
  const themeScriptHash = hashInlineScript(themeInitScript);

  // La API vive en otro origen (puerto distinto en dev, dominio propio
  // en prod) — sin esto, connect-src 'self' bloquearía cada fetch del
  // browser hacia el backend.
  let apiOrigin = "'self'";
  try {
    apiOrigin = new URL(
      process.env.NEXT_PUBLIC_API_URL ?? 'https://localhost:7127',
    ).origin;
  } catch {
    // URL inválida: se queda con el fallback 'self' antes que romper el build.
  }

  return [
    "default-src 'self'",
    `script-src 'self' ${themeScriptHash}`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ];

    // CSP y HSTS solo en producción: un CSP estricto (sin 'unsafe-eval')
    // rompería el Fast Refresh/HMR de `next dev` (usa eval), y HSTS no
    // tiene sentido servido por HTTP en desarrollo.
    if (!isDev) {
      securityHeaders.push(
        { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains',
        },
      );
    }

    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
