import {
  evaluatePasswordRules,
  isPasswordValid,
  passwordRules,
} from './password-rules';

function ruleTest(id: string, password: string, context?: { passwordActual?: string }) {
  const rule = passwordRules.find((r) => r.id === id);
  if (!rule) throw new Error(`Regla no encontrada: ${id}`);
  return rule.test(password, context);
}

describe('password-rules: reglas individuales', () => {
  it('length: exige mínimo 10 caracteres', () => {
    expect(ruleTest('length', 'Corta1!')).toBe(false);
    expect(ruleTest('length', 'Dt#2026diez')).toBe(true);
  });

  it('uppercase: exige al menos una mayúscula', () => {
    expect(ruleTest('uppercase', 'sinmayuscula1!')).toBe(false);
    expect(ruleTest('uppercase', 'ConMayuscula1!')).toBe(true);
  });

  it('lowercase: exige al menos una minúscula', () => {
    expect(ruleTest('lowercase', 'SINMINUSCULA1!')).toBe(false);
    expect(ruleTest('lowercase', 'ConMinuscula1!')).toBe(true);
  });

  it('number: exige al menos un número', () => {
    expect(ruleTest('number', 'SinNumeros!!')).toBe(false);
    expect(ruleTest('number', 'ConNumero1!')).toBe(true);
  });

  it('special: exige al menos un carácter especial', () => {
    expect(ruleTest('special', 'SinEspecial10')).toBe(false);
    expect(ruleTest('special', 'ConEspecial1!')).toBe(true);
  });

  it('not-generic: rechaza contraseñas de la lista de genéricas conocidas', () => {
    expect(ruleTest('not-generic', 'Password123!')).toBe(false);
    expect(ruleTest('not-generic', 'password123!')).toBe(false); // case-insensitive
    expect(ruleTest('not-generic', 'Dt#2026reto99')).toBe(true);
  });

  it('not-generic: rechaza las entradas agregadas para igualar la lista del backend', () => {
    expect(ruleTest('not-generic', 'contrasena')).toBe(false);
    expect(ruleTest('not-generic', 'CONTRASENA')).toBe(false); // case-insensitive
    expect(ruleTest('not-generic', 'incorrecta')).toBe(false);
  });

  it('not-generic: rechaza la contraseña actual/temporal cuando se provee el contexto', () => {
    expect(
      ruleTest('not-generic', 'Temporal1!', { passwordActual: 'Temporal1!' }),
    ).toBe(false);
    expect(
      ruleTest('not-generic', 'UnaNueva1!', { passwordActual: 'Temporal1!' }),
    ).toBe(true);
  });
});

describe('evaluatePasswordRules', () => {
  it('devuelve un resultado por cada regla, con id/label/met', () => {
    const result = evaluatePasswordRules('Dt#2026reto');

    expect(result).toHaveLength(passwordRules.length);
    result.forEach((r) => {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('label');
      expect(r).toHaveProperty('met');
    });
  });

  it('marca como no cumplidos solo los requisitos que faltan', () => {
    const result = evaluatePasswordRules('sinnumeros');

    const byId = Object.fromEntries(result.map((r) => [r.id, r.met]));
    expect(byId.length).toBe(true);
    expect(byId.lowercase).toBe(true);
    expect(byId.uppercase).toBe(false);
    expect(byId.number).toBe(false);
    expect(byId.special).toBe(false);
  });
});

describe('isPasswordValid', () => {
  it('es true solo cuando se cumplen las 6 reglas', () => {
    expect(isPasswordValid('Dt#2026reto')).toBe(true);
    expect(isPasswordValid('corta1!')).toBe(false);
    expect(isPasswordValid('Password123!')).toBe(false); // genérica
  });

  it('considera el contexto de passwordActual', () => {
    expect(
      isPasswordValid('Dt#2026reto', { passwordActual: 'Dt#2026reto' }),
    ).toBe(false);
  });
});
