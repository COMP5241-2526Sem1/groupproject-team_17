using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InteractiveHub.Service.ClassRelated.Migrations
{
    /// <inheritdoc />
    public partial class ClassDbContextV7 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "JoinCheckingMode",
                table: "Courses");

            migrationBuilder.AddColumn<string>(
                name: "JoinCheckingModes",
                table: "Courses",
                type: "longtext",
                nullable: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "JoinCheckingModes",
                table: "Courses");

            migrationBuilder.AddColumn<int>(
                name: "JoinCheckingMode",
                table: "Courses",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
