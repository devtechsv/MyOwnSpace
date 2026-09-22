import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'turquoise-blue': {
          '50': '#ecfeff',
          '100': '#cffbfe',
          '200': '#a6f5fb',
          '300': '#68eaf8',
          '400': '#3edbef', // main
          '500': '#07b9d3',
          '600': '#0993b1',
          '700': '#0f768f',
          '800': '#166074',
          '900': '#164f63',
          '950': '#083444',
        },
        // Tokens semánticos: cambian de valor entre modo claro/oscuro vía las
        // custom properties definidas en globals.css (según la clase `dark`
        // en <html>), así los componentes usan `bg-background`, `text-muted`,
        // etc. en vez de repetir pares `bg-[#...] dark:bg-[#...]`.
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-field': 'rgb(var(--color-surface-field) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
export default config;
