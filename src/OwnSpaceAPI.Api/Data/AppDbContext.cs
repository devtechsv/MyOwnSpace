using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Data;

public class AppDbContext : DbContext
{
  public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
  {

  }

  public DbSet<User> Users => Set<User>();
  public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
  public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    modelBuilder.Entity<User>(entity =>
    {
      entity.Property(u => u.Nombre).HasMaxLength(200).IsRequired();
      entity.Property(u => u.Correo).HasMaxLength(256).IsRequired();
      entity.Property(u => u.SecurityStamp).HasMaxLength(64).IsRequired();
      entity.HasIndex(u => u.Correo).IsUnique();

      entity.Property(u => u.Rol).HasConversion<string>().HasMaxLength(20);
      entity.Property(u => u.Estado).HasConversion<string>().HasMaxLength(20);

      entity.ToTable(t => t.HasCheckConstraint(
        "CK_Users_Rol",
        "[Rol] IN ('Empleado', 'Administrador', 'SuperAdmin')"));
      entity.ToTable(t => t.HasCheckConstraint(
        "CK_Users_Estado",
        "[Estado] IN ('Pendiente', 'Activo', 'Desactivado')"));
    });

    modelBuilder.Entity<LeaveRequest>(entity =>
    {
      entity.Property(r => r.Motivo).HasMaxLength(1000).IsRequired();
      // "Permiso personal" tiene espacio — el enum de C# no puede
      // llamarse así (es PermisoPersonal), así que acá se traduce a
      // mano en vez de usar HasConversion<string>() genérico.

      entity.Property(r => r.Tipo)
        .HasConversion(
          v => v == RequestType.PermisoPersonal ? "Permiso personal" : v.ToString(),
          v => v == "Permiso personal" ? RequestType.PermisoPersonal : Enum.Parse<RequestType>(v))
        .HasMaxLength(30);

      entity.Property(r => r.Estado).HasConversion<string>().HasMaxLength(20);



      entity.ToTable(t => t.HasCheckConstraint(
        "CK_LeaveRequests_Tipo",
        "[Tipo] IN ('Emergencia', 'Enfermedad', 'Permiso personal', 'Otro')"));
      entity.ToTable(t => t.HasCheckConstraint(
        "CK_LeaveRequests_Estado",
        "[Estado] IN ('Pendiente', 'Aprobada', 'Denegada')"));

      // Dos FKs a Users (Employee y Reviewer) — hay que declarar
      // ambas explícitas, y en Restrict: si dejáramos Cascade en las
      // dos, SQL Server rechazaría el esquema por rutas de cascada
      // ambiguas (borrar un User podría cascadear a la misma tabla
      // por dos caminos distintos).
      entity.HasOne(r => r.Employee)
        .WithMany(u => u.Solicitudes)
        .HasForeignKey(r => r.EmployeeId)
        .OnDelete(DeleteBehavior.Restrict);

      entity.HasOne(r => r.Reviewer)
        .WithMany()
        .HasForeignKey(r => r.ReviewedBy)
        .OnDelete(DeleteBehavior.Restrict);
    });

    modelBuilder.Entity<PasswordResetToken>(entity =>
        {
          entity.HasOne(t => t.User)
              .WithMany()
              .HasForeignKey(t => t.UserId)
              .OnDelete(DeleteBehavior.Cascade);
        });
  }

}