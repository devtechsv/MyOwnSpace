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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
