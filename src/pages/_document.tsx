import { Html, Head, Main, NextScript } from 'next/document';

// Aplica la clase `dark` antes del hidratado de React para evitar el
// parpadeo de tema al cargar la página (lee la misma clave de
// localStorage que usa el hook useTheme).
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

export default function Document() {
  return (
    <Html lang='es'>
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
