using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OwnSpaceAPI.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityStampToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SecurityStamp",
                table: "Users",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            // Cada fila existente arranca con un stamp único de verdad
            // (no todas compartiendo "") — no es un requisito de
            // seguridad (cada request se compara contra el propio
            // usuario, nunca entre usuarios), pero evita dejar un valor
            // que se ve como un placeholder sin inicializar.
            migrationBuilder.Sql(
                "UPDATE Users SET SecurityStamp = LOWER(REPLACE(CONVERT(varchar(36), NEWID()), '-', ''));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SecurityStamp",
                table: "Users");
        }
    }
}
