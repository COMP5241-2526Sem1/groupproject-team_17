using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InteractiveHub.Service.ClassRelated.Migrations
{
    /// <inheritdoc />
    public partial class AddActivitiesAndSubmissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Skip RealtimeClass operations as table doesn't exist yet
            // migrationBuilder.DropForeignKey(
            //     name: "FK_RealtimeClass_Courses_CourseId1",
            //     table: "RealtimeClass");

            // migrationBuilder.DropIndex(
            //     name: "IX_RealtimeClass_CourseId1",
            //     table: "RealtimeClass");

            // migrationBuilder.DropColumn(
            //     name: "CourseId1",
            //     table: "RealtimeClass");

            migrationBuilder.AlterColumn<string>(
                name: "ActivityId",
                table: "Submissions",
                type: "varchar(256)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)");

            migrationBuilder.AddForeignKey(
                name: "FK_Submissions_Activities_ActivityId",
                table: "Submissions",
                column: "ActivityId",
                principalTable: "Activities",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Submissions_Activities_ActivityId",
                table: "Submissions");

            migrationBuilder.AlterColumn<string>(
                name: "ActivityId",
                table: "Submissions",
                type: "varchar(255)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(256)");

            // Skip RealtimeClass operations as table doesn't exist
            // migrationBuilder.AddColumn<string>(
            //     name: "CourseId1",
            //     table: "RealtimeClass",
            //     type: "varchar(256)",
            //     nullable: true);

            // migrationBuilder.CreateIndex(
            //     name: "IX_RealtimeClass_CourseId1",
            //     table: "RealtimeClass",
            //     column: "CourseId1");

            // migrationBuilder.AddForeignKey(
            //     name: "FK_RealtimeClass_Courses_CourseId1",
            //     table: "RealtimeClass",
            //     column: "CourseId1",
            //     principalTable: "Courses",
            //     principalColumn: "Id");
        }
    }
}
