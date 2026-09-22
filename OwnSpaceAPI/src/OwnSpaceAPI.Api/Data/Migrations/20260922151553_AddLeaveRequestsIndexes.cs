using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OwnSpaceAPI.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveRequestsIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LeaveRequests_EmployeeId",
                table: "LeaveRequests");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_EmployeeId_CreatedAt",
                table: "LeaveRequests",
                columns: new[] { "EmployeeId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_Estado_CreatedAt",
                table: "LeaveRequests",
                columns: new[] { "Estado", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LeaveRequests_EmployeeId_CreatedAt",
                table: "LeaveRequests");

            migrationBuilder.DropIndex(
                name: "IX_LeaveRequests_Estado_CreatedAt",
                table: "LeaveRequests");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_EmployeeId",
                table: "LeaveRequests",
                column: "EmployeeId");
        }
    }
}
