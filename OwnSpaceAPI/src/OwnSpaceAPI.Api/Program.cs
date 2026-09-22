using System.Security.Claims;
using OwnSpaceAPI.Api.Models.Entities;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Services;
using OwnSpaceAPI.Api.Services.Audit;
using OwnSpaceAPI.Api.Services.Auth;
using OwnSpaceAPI.Api.Services.Exceptions;
using OwnSpaceAPI.Api.Services.Requests;
using OwnSpaceAPI.Api.Services.Users;
using OwnSpaceAPI.Api.Services.Pto;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
      // Por defecto System.Text.Json serializa enums como su valor
      // numérico (0,1,2...) — el contrato (docs/openapi.yaml) espera
      // los strings ("Empleado", "Activo", etc.), igual que el frontend.
      options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
  throw new InvalidOperationException("Falta configurar ConnectionStrings:DefaultConnection.");
}
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddSingleton<IPasswordHashingService, PasswordHashingService>();

builder.Services.Configure<ResendOptions>(builder.Configuration.GetSection("Resend"));
var resendApiKey = builder.Configuration["Resend:ApiKey"];
var resendFromAddress = builder.Configuration["Resend:FromAddress"];
if (string.IsNullOrWhiteSpace(resendApiKey) || string.IsNullOrWhiteSpace(resendFromAddress))
{
  throw new InvalidOperationException("Falta configurar Resend:ApiKey y Resend:FromAddress.");
}
builder.Services.AddHttpClient<IEmailSender, ResendEmailSender>(client =>
{
  client.BaseAddress = new Uri("https://api.resend.com/");
  client.DefaultRequestHeaders.Authorization =
      new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", resendApiKey);
});

builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();
builder.Services.AddScoped<IUsersService, UsersService>();
builder.Services.AddScoped<IRequestsService, RequestsService>();
builder.Services.AddScoped<IPtoBalanceService, PtoBalanceService>();
builder.Services.AddScoped<IPtoRequestsService, PtoRequestsService>();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, NotFoundOnForbidResultHandler>();

const string FrontendCorsPolicy = "FrontendCorsPolicy";

builder.Services.AddCors(options =>
{
  options.AddPolicy(FrontendCorsPolicy, policy =>
  {
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
          ?? Array.Empty<string>();

    // AllowCredentials() es obligatorio porque la sesión viaja en
    // una cookie (SPEC.md §9) — sin esto, el navegador nunca manda
    // la cookie en requests cross-origin, aunque el resto de CORS
    // esté bien configurado. Por eso mismo NO se puede usar
    // AllowAnyOrigin() junto con AllowCredentials() (el navegador
    // lo rechaza) — tiene que ser una lista explícita de orígenes.
    //
    // La cookie de sesión usa SameSite=Lax (ver SetAccessTokenCookie en
    // AuthController) en vez de None: eso asume que front y back se
    // despliegan same-site (incluso si son subdominios/puertos
    // distintos). Si algún día el frontend pasa a servirse desde un
    // dominio de verdad distinto al del backend, esto hay que
    // revisarlo junto con SameSite (Lax no viaja en ese caso).
    policy.WithOrigins(allowedOrigins)
          .AllowAnyHeader()
          .AllowAnyMethod()
          .AllowCredentials();
  });
});
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
      var signingKey = builder.Configuration["Jwt:SigningKey"];
      if (string.IsNullOrWhiteSpace(signingKey) || Encoding.UTF8.GetByteCount(signingKey) < 32)
      {
        throw new InvalidOperationException("Jwt:SigningKey debe estar configurado con al menos 32 bytes (256 bits).");
      }

      options.TokenValidationParameters = new TokenValidationParameters
      {
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
        ClockSkew = TimeSpan.Zero,
      };

      options.Events = new JwtBearerEvents
      {
        OnMessageReceived = context =>
        {
          if (context.Request.Cookies.TryGetValue("accessToken", out var token))
          {
            context.Token = token;
          }
          return Task.CompletedTask;
        },

        // Esto es lo que hace que desactivar/cambiar rol/logout tengan
        // efecto inmediato en CUALQUIER endpoint, no solo en la
        // renovación de /auth/session: en cada request autenticado se
        // vuelve a comparar el securityStamp del token contra el de la
        // base. Si no coincide (o el usuario ya no está Activo), el
        // token se rechaza aunque su firma y expiración sean válidas.
        OnTokenValidated = async context =>
        {
          var userIdRaw = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
          var stamp = context.Principal?.FindFirstValue(OwnSpaceClaimTypes.SecurityStamp);

          if (userIdRaw is null || stamp is null || !Guid.TryParse(userIdRaw, out var userId))
          {
            context.Fail("Token inválido.");
            return;
          }

          var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
          var current = await db.Users.AsNoTracking()
              .Where(u => u.Id == userId)
              .Select(u => new { u.Estado, u.SecurityStamp })
              .FirstOrDefaultAsync();

          if (current is null || current.Estado != UserStatus.Activo || current.SecurityStamp != stamp)
          {
            context.Fail("Sesión inválida o revocada.");
          }
        },
      };
    });

builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(options =>
{
  options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
  options.AddPolicy("auth", httpContext => RateLimitPartition.GetFixedWindowLimiter(
      partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
      factory: _ => new FixedWindowRateLimiterOptions
      {
        PermitLimit = 10,
        Window = TimeSpan.FromMinutes(1),
        QueueLimit = 0,
      }));
});

var app = builder.Build();

// La topología de producción pone nginx delante de Kestrel como reverse
// proxy — sin esto, Connection.RemoteIpAddress ve siempre la IP del
// proxy, no la del cliente real, lo que colapsa el límite de la policy
// "auth" (particionada por IP) en un único bucket compartido por todos
// los usuarios: 10 intentos de cualquiera bastan para bloquear el login
// de todo el mundo. Va primero en el pipeline porque HSTS, el rate
// limiter y todo lo demás necesitan ver ya la IP/esquema corregidos.
// Los valores por defecto de KnownNetworks/KnownProxies (loopback)
// cubren nginx corriendo en la misma máquina/contenedor que la API —
// si termina desplegado en un host o red distinta, hay que agregar esa
// IP/red acá (o por configuración) para que se lo siga confiando.
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
  ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
});

if (!app.Environment.IsDevelopment())
{
  app.UseHsts();
}

app.Use(async (context, next) =>
{
  // Cabeceras de seguridad básicas — no dependen de configuración y
  // aplican a toda respuesta, incluidas las de error.
  context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
  context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
  context.Response.Headers.Append("X-Frame-Options", "DENY");
  await next();
});

// UseCors tiene que ir antes que UseExceptionHandler: si va después,
// una respuesta de error (4xx/5xx) generada por el exception handler no
// lleva cabeceras CORS, y el navegador la descarta silenciosamente en
// vez de dejar que el frontend vea el status/mensaje real.
app.UseCors(FrontendCorsPolicy);
app.UseExceptionHandler();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
  app.UseSwagger();
  app.UseSwaggerUI();
}

// Corre en todo entorno (no solo desarrollo): es idempotente y no hace
// nada si ya existe un Administrador, así que no tiene efecto sobre una
// base ya en uso. Ver SeedData.SeedAdminAsync — solo importa
// Seed:AdminPassword la primera vez que arranca contra una base vacía.
{
  using var scope = app.Services.CreateScope();
  var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
  var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHashingService>();
  var seedLogger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("SeedData");
  await SeedData.SeedAdminAsync(db, passwordHasher, app.Configuration, seedLogger);
}

app.UseHttpsRedirection();
app.UseRateLimiter();
app.UseAuthentication();

// Después de UseAuthentication (context.User ya refleja los claims del
// JWT) y antes de UseAuthorization/MapControllers: mientras el usuario
// tenga una contraseña temporal sin cambiar, solo puede llamar a
// change-password/logout/session — cualquier otro endpoint de /api
// devuelve 403. Sin esto, el "forzar el cambio" sería solo cosmético
// del lado del frontend (cualquiera podría seguir usando la temporal
// llamando a la API directo).
app.Use(async (context, next) =>
{
  if (context.User.Identity?.IsAuthenticated == true
      && context.Request.Path.StartsWithSegments("/api")
      && bool.TryParse(context.User.FindFirstValue(OwnSpaceClaimTypes.MustChangePassword), out var mustChange)
      && mustChange)
  {
    var path = context.Request.Path;
    var permitido = path.StartsWithSegments("/api/v1/auth/change-password")
        || path.StartsWithSegments("/api/v1/auth/logout")
        || path.StartsWithSegments("/api/v1/auth/session");

    if (!permitido)
    {
      context.Response.StatusCode = StatusCodes.Status403Forbidden;
      await context.Response.WriteAsJsonAsync(new
      {
        title = "Debés cambiar tu contraseña temporal antes de continuar.",
        status = StatusCodes.Status403Forbidden,
      });
      return;
    }
  }

  await next();
});

app.UseAuthorization();

app.MapControllers();

app.Run();

// Necesario para que WebApplicationFactory<Program> (tests de integración
// futuros) pueda referenciar este proyecto — Program.cs usa top-level
// statements, que generan una clase Program interna por defecto.
public partial class Program { }
