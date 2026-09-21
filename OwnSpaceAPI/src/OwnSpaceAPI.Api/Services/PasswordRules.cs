using System.Text.RegularExpressions;

namespace OwnSpaceAPI.Api.Services;

public sealed class PasswordRuleContext
{
  //Contraseña temporal del usuario.
  // La nueva no puede ser igual luego de haber realizado el cambio
  public string? PasswordActual {get; init; }
}
public sealed record PasswordRule(string Id, string Label, Func<string, PasswordRuleContext?, bool> Test);
public sealed record PasswordRuleResult(string Id, string Label, bool Met);

public static class PasswordRules
{
  // Duplicada a mano en src/lib/password-rules.ts del frontend (esta
  // lista de acá es la autoridad real; la del frontend solo da feedback
  // en vivo en el formulario) — mantener las dos listas iguales si se
  // edita una. "12345" se sacó: nunca hizo nada, 5 caracteres ya
  // rechaza por la regla de longitud mínima antes de llegar acá.
  private static readonly HashSet<string> ContrasenasGenericas = new(StringComparer.OrdinalIgnoreCase)
    {
        "password123!",
        "password1234",
        "123456789!",
        "qwerty123!",
        "admin1234!",
        "devtech123!",
        "bienvenido1!",
        "contrasena",
        "contraseña",
        "incorrecta",
        "incorrecto",
    };

    public static readonly IReadOnlyList<PasswordRule> Rules = new List<PasswordRule>
    {
        new("length", "Mínimo 10 caracteres",
            (p, _) => p.Length >= 10),

        new("uppercase", "Al menos una mayúscula (A-Z)",
            (p, _) => Regex.IsMatch(p, "[A-ZÁÉÍÓÚÑ]")),

        new("lowercase", "Al menos una minúscula (a-z)",
            (p, _) => Regex.IsMatch(p, "[a-záéíóúñ]")),

        new("number", "Al menos un número (0-9)",
            (p, _) => Regex.IsMatch(p, "[0-9]")),

        new("special", "Al menos un carácter especial (!@#$...)",
            (p, _) => Regex.IsMatch(p, "[^A-Za-z0-9]")),

        new("not-generic", "No ser una contraseña genérica o la temporal recibida",
            (p, ctx) =>
            {
                if (ContrasenasGenericas.Contains(p))
                {
                    return false;
                }
                if (!string.IsNullOrEmpty(ctx?.PasswordActual) && p == ctx.PasswordActual)
                {
                    return false;
                }
                return true;
            }),
    };
    public static IReadOnlyList<PasswordRuleResult> Evaluate(string password, PasswordRuleContext? context = null) =>
        Rules.Select(r => new PasswordRuleResult(r.Id, r.Label, r.Test(password, context))).ToList();

    public static bool IsValid(string password, PasswordRuleContext? context = null) =>
        Rules.All(r => r.Test(password, context));



}