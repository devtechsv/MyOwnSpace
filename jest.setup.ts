import '@testing-library/jest-dom';

// jsdom no implementa matchMedia. Se define un valor por defecto
// (sin preferencia de modo oscuro) para que cualquier componente que
// use useTheme() funcione en los tests sin tener que mockearlo cada
// vez; los tests que sí necesitan controlar la preferencia del
// sistema (useTheme.test.ts, ThemeToggle.test.tsx) lo redefinen ellos
// mismos con Object.defineProperty.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
