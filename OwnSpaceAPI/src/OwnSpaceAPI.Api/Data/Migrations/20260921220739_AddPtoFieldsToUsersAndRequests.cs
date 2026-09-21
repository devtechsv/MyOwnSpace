using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OwnSpaceAPI.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPtoFieldsToUsersAndRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "FechaDesactivacion",
                table: "Users",
                type: "date",
                nullable: true);

            // Default solo para las filas ya existentes (usuarios de seed
            // y de pruebas manuales) — cualquier alta nueva manda su
            // FechaIngreso real desde CreateUserRequest. La fórmula de
            // balance recorta igual con max(FechaIngreso, 1-enero-actual),
            // así que este placeholder no distorsiona el devengo de nadie.
            migrationBuilder.AddColumn<DateOnly>(
                name: "FechaIngreso",
                table: "Users",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(2026, 1, 1));

            migrationBuilder.AddColumn<decimal>(
                name: "HorasSolicitadas",
                table: "LeaveRequests",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FechaDesactivacion",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "FechaIngreso",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "HorasSolicitadas",
                table: "LeaveRequests");
        }
    }
}
