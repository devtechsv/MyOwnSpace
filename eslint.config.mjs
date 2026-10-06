import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    // El modo simulado (incluida su copia de las reglas de PTO) solo se
    // elige en src/services/*/*.api.ts. Las pantallas hablan con la API a
    // través de API.*: si importaran el mock directo, usarían reglas que
    // no son las del backend.
    files: ['src/{components,pages,hooks,lib,helpers,middlewares}/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services/mocks/*', '**/services/mocks/*'],
              message: 'Usa API.* (src/services/api-services.ts); el modo simulado solo se elige en los *.api.ts.',
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
