using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OwnSpaceAPI.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVacacionesTypeAndRequestHora : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_LeaveRequests_Tipo",
                table: "LeaveRequests");

            migrationBuilder.AddColumn<TimeOnly>(
                name: "HoraFin",
                table: "LeaveRequests",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "HoraInicio",
                table: "LeaveRequests",
                type: "time",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_LeaveRequests_Tipo",
                table: "LeaveRequests",
                sql: "[Tipo] IN ('Emergencia', 'Enfermedad', 'Permiso personal', 'Vacaciones', 'Otro')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_LeaveRequests_Tipo",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "HoraFin",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "HoraInicio",
                table: "LeaveRequests");

            migrationBuilder.AddCheckConstraint(
                name: "CK_LeaveRequests_Tipo",
                table: "LeaveRequests",
                sql: "[Tipo] IN ('Emergencia', 'Enfermedad', 'Permiso personal', 'Otro')");
        }
    }
}
