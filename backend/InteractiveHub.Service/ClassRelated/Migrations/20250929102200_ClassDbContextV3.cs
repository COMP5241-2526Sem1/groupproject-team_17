using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InteractiveHub.Service.ClassRelated.Migrations
{
    /// <inheritdoc />
    public partial class ClassDbContextV3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FullName",
                table: "Students",
                type: "longtext",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "PIN",
                table: "Students",
                type: "longtext",
                nullable: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FullName",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "PIN",
                table: "Students");
        }
    }
}
