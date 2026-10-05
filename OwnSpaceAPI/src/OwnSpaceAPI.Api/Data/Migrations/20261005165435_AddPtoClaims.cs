using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OwnSpaceAPI.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPtoClaims : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PtoClaims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CorteDesde = table.Column<DateOnly>(type: "date", nullable: false),
                    CorteHasta = table.Column<DateOnly>(type: "date", nullable: false),
                    Horas = table.Column<decimal>(type: "decimal(6,2)", precision: 6, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PtoClaims", x => x.Id);
                    table.CheckConstraint("CK_PtoClaims_Tramo", "[CorteHasta] >= [CorteDesde]");
                    table.ForeignKey(
                        name: "FK_PtoClaims_Users_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PtoClaims_EmployeeId_CorteHasta",
                table: "PtoClaims",
                columns: new[] { "EmployeeId", "CorteHasta" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PtoClaims");
        }
    }
}
