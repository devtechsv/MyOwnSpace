import { Html, Head, Main, NextScript } from 'next/document';
import { themeInitScript } from '@/lib/theme-init-script';

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
