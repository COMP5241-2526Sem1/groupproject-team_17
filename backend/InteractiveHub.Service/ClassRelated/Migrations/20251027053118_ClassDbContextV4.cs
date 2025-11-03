using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InteractiveHub.Service.ClassRelated.Migrations
{
    /// <inheritdoc />
    public partial class ClassDbContextV4 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "JoinCode",
                table: "Courses",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "JoinCode",
                table: "Courses");
        }
    }
}
