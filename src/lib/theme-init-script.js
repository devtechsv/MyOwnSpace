// Script de inicio de tema (evita el parpadeo de tema al cargar, ver
// _document.tsx) — compartido con next.config.js, que lo hashea para
// permitirlo en la Content-Security-Policy sin recurrir a
// 'unsafe-inline'. Archivo .js plano en CommonJS a propósito:
// next.config.js lo importa con require() directo, sin pasar por el
// compilador de Next — si se edita el contenido del script, el hash de
// la CSP se recalcula solo (ambos leen esta misma constante).
const themeInitScript = `
(function () {
  try {
    var stored = window.localStorage.getItem('myownspace-theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

module.exports = { themeInitScript };
