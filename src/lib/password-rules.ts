export interface PasswordRuleContext {
  // Contraseña temporal o actual del usuario, cuando corresponde
  // (crear usuario, resetear contraseña) — la nueva no puede ser igual.
  passwordActual?: string;
}

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string, context?: PasswordRuleContext) => boolean;
}

// Lista mínima de contraseñas genéricas/comunes bloqueadas, además de la
// comparación contra la contraseña temporal/actual (vía el contexto).
const CONTRASENAS_GENERICAS = [
  'password123!',
  'password1234',
  '123456789!',
  'qwerty123!',
  'admin1234!',
  'devtech123!',
  'bienvenido1!',
];

export const passwordRules: PasswordRule[] = [
  {
    id: 'length',
    label: 'Mínimo 10 caracteres',
    test: (password) => password.length >= 10,
  },
  {
    id: 'uppercase',
    label: 'Al menos una mayúscula (A-Z)',
    test: (password) => /[A-ZÁÉÍÓÚÑ]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'Al menos una minúscula (a-z)',
    test: (password) => /[a-záéíóúñ]/.test(password),
  },
  {
    id: 'number',
    label: 'Al menos un número (0-9)',
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: 'special',
    label: 'Al menos un carácter especial (!@#$...)',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
  {
    id: 'not-generic',
    label: 'No ser una contraseña genérica o la temporal recibida',
    test: (password, context) => {
      if (CONTRASENAS_GENERICAS.includes(password.toLowerCase())) {
        return false;
      }
      if (context?.passwordActual && password === context.passwordActual) {
        return false;
      }
      return true;
    },
  },
];

export interface PasswordRuleResult {
  id: string;
  label: string;
  met: boolean;
}

export function evaluatePasswordRules(
  password: string,
  context?: PasswordRuleContext,
): PasswordRuleResult[] {
  return passwordRules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(password, context),
  }));
}

export function isPasswordValid(
  password: string,
  context?: PasswordRuleContext,
): boolean {
  return passwordRules.every((rule) => rule.test(password, context));
}
