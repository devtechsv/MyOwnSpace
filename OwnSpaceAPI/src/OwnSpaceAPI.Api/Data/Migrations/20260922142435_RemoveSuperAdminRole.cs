using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OwnSpaceAPI.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSuperAdminRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Users_Rol",
                table: "Users");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Users_Rol",
                table: "Users",
                sql: "[Rol] IN ('Empleado', 'Administrador')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Users_Rol",
                table: "Users");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Users_Rol",
                table: "Users",
                sql: "[Rol] IN ('Empleado', 'Administrador', 'SuperAdmin')");
        }
    }
}
