using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OwnSpaceAPI.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAccesosAuditLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AuditLogs_Accion",
                table: "AuditLogs");

            migrationBuilder.AlterColumn<Guid>(
                name: "EntidadId",
                table: "AuditLogs",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<Guid>(
                name: "ActorId",
                table: "AuditLogs",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AuditLogs_Accion",
                table: "AuditLogs",
                sql: "[Accion] IN ('UsuarioCreado', 'UsuarioEditado', 'ContrasenaReseteada', 'EstadoUsuarioCambiado', 'SolicitudAprobada', 'SolicitudDenegada', 'InicioSesion', 'InicioSesionFallido', 'CierreSesion')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Las entradas de acceso pueden tener ActorId/EntidadId en null y
            // no caben en el esquema anterior: sin borrarlas, el rollback falla.
            migrationBuilder.Sql(
                "DELETE FROM [AuditLogs] WHERE [Accion] IN ('InicioSesion', 'InicioSesionFallido', 'CierreSesion')");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AuditLogs_Accion",
                table: "AuditLogs");

            migrationBuilder.AlterColumn<Guid>(
                name: "EntidadId",
                table: "AuditLogs",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ActorId",
                table: "AuditLogs",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_AuditLogs_Accion",
                table: "AuditLogs",
                sql: "[Accion] IN ('UsuarioCreado', 'UsuarioEditado', 'ContrasenaReseteada', 'EstadoUsuarioCambiado', 'SolicitudAprobada', 'SolicitudDenegada')");
        }
    }
}
