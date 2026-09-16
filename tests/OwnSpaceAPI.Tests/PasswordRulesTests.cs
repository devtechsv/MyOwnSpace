using OwnSpaceAPI.Api.Services;

namespace OwnSpaceAPI.Tests;

public class PasswordRulesTests
{
    [Theory]
    [InlineData("Corta1!", false)]
    [InlineData("EstoEsSuficientementeLargo1!", true)]
    public void Regla_Longitud(string password, bool esperado)
    {
        var resultado = PasswordRules.Evaluate(password).Single(r => r.Id == "length");
        Assert.Equal(esperado, resultado.Met);
    }

    [Theory]
    [InlineData("sinmayuscula1!aaa", false)]
    [InlineData("ConMayuscula1!aaa", true)]
    public void Regla_Mayuscula(string password, bool esperado)
    {
        var resultado = PasswordRules.Evaluate(password).Single(r => r.Id == "uppercase");
        Assert.Equal(esperado, resultado.Met);
    }

    [Theory]
    [InlineData("SINMINUSCULA1!AAA", false)]
    [InlineData("conMinuscula1!AAA", true)]
    public void Regla_Minuscula(string password, bool esperado)
    {
        var resultado = PasswordRules.Evaluate(password).Single(r => r.Id == "lowercase");
        Assert.Equal(esperado, resultado.Met);
    }

    [Theory]
    [InlineData("SinNumeros!Aaaaaa", false)]
    [InlineData("ConNumero1!Aaaaaa", true)]
    public void Regla_Numero(string password, bool esperado)
    {
        var resultado = PasswordRules.Evaluate(password).Single(r => r.Id == "number");
        Assert.Equal(esperado, resultado.Met);
    }

    [Theory]
    [InlineData("SinEspecial1Aaaaaa", false)]
    [InlineData("ConEspecial1!Aaaaa", true)]
    public void Regla_Especial(string password, bool esperado)
    {
        var resultado = PasswordRules.Evaluate(password).Single(r => r.Id == "special");
        Assert.Equal(esperado, resultado.Met);
    }

    [Fact]
    public void Regla_NoGenerica_RechazaContraseniaGenerica()
    {
        var resultado = PasswordRules.Evaluate("Password123!").Single(r => r.Id == "not-generic");
        Assert.False(resultado.Met);
    }

    [Fact]
    public void Regla_NoGenerica_RechazaLaMismaContraseniaActual()
    {
        var contexto = new PasswordRuleContext { PasswordActual = "Temporal123!" };
        var resultado = PasswordRules.Evaluate("Temporal123!", contexto).Single(r => r.Id == "not-generic");
        Assert.False(resultado.Met);
    }

    [Fact]
    public void Regla_NoGenerica_AceptaContraseniaNuevaYNoGenerica()
    {
        var contexto = new PasswordRuleContext { PasswordActual = "Temporal123!" };
        var resultado = PasswordRules.Evaluate("OtraDistinta1!", contexto).Single(r => r.Id == "not-generic");
        Assert.True(resultado.Met);
    }

    [Fact]
    public void IsValid_ContraseniaQueCumpleTodo_DevuelveTrue()
    {
        Assert.True(PasswordRules.IsValid("ContraseniaValida1!"));
    }

    [Fact]
    public void IsValid_ContraseniaCorta_DevuelveFalse()
    {
        Assert.False(PasswordRules.IsValid("Corta1!"));
    }
}