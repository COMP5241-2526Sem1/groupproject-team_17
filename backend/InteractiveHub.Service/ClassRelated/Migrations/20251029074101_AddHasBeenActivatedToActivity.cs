using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InteractiveHub.Service.ClassRelated.Migrations
{
    /// <inheritdoc />
    public partial class AddHasBeenActivatedToActivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasBeenActivated",
                table: "Activities",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasBeenActivated",
                table: "Activities");
        }
    }
}
