using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InteractiveHub.Service.ClassRelated.Migrations
{
    /// <inheritdoc />
    public partial class ClassDbContextV8 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TeachingClass");

            migrationBuilder.CreateTable(
                name: "Activities",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(256)", nullable: false),
                    CourseId = table.Column<string>(type: "varchar(255)", nullable: false),
                    Title = table.Column<string>(type: "longtext", nullable: false),
                    Description = table.Column<string>(type: "longtext", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    Discussion_MaxLength = table.Column<int>(type: "int", nullable: true),
                    Discussion_AllowAnonymous = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    Discussion_RequireApproval = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    Poll_OptionsJson = table.Column<string>(type: "longtext", nullable: true),
                    Poll_AllowMultipleSelections = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    Poll_IsAnonymous = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    Quiz_QuestionsJson = table.Column<string>(type: "longtext", nullable: true),
                    Quiz_TimeLimit = table.Column<int>(type: "int", nullable: true),
                    Quiz_ShowCorrectAnswers = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    Quiz_ShuffleQuestions = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    OwnerId = table.Column<string>(type: "varchar(255)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Activities", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "RealtimeClass",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(256)", nullable: false),
                    CourseId = table.Column<string>(type: "varchar(256)", nullable: false),
                    CourseId1 = table.Column<string>(type: "varchar(256)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    OwnerId = table.Column<string>(type: "varchar(255)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RealtimeClass", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RealtimeClass_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RealtimeClass_Courses_CourseId1",
                        column: x => x.CourseId1,
                        principalTable: "Courses",
                        principalColumn: "Id");
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Submissions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(256)", nullable: false),
                    CourseId = table.Column<string>(type: "varchar(255)", nullable: false),
                    StudentId = table.Column<string>(type: "varchar(255)", nullable: false),
                    ActivityId = table.Column<string>(type: "varchar(255)", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Discussion_Text = table.Column<string>(type: "longtext", nullable: true),
                    Discussion_IsApproved = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    Discussion_IsAnonymous = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    Poll_SelectedOptionsJson = table.Column<string>(type: "longtext", nullable: true),
                    Quiz_AnswersJson = table.Column<string>(type: "longtext", nullable: true),
                    Quiz_Score = table.Column<double>(type: "double", nullable: true),
                    Quiz_TimeSpent = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    OwnerId = table.Column<string>(type: "varchar(255)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Submissions", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Activities_CourseId",
                table: "Activities",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_Activities_CourseId_IsActive",
                table: "Activities",
                columns: new[] { "CourseId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Activities_OwnerId",
                table: "Activities",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_RealtimeClass_CourseId",
                table: "RealtimeClass",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_RealtimeClass_CourseId1",
                table: "RealtimeClass",
                column: "CourseId1");

            migrationBuilder.CreateIndex(
                name: "IX_RealtimeClass_OwnerId",
                table: "RealtimeClass",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_ActivityId",
                table: "Submissions",
                column: "ActivityId");

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_CourseId_ActivityId",
                table: "Submissions",
                columns: new[] { "CourseId", "ActivityId" });

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_OwnerId",
                table: "Submissions",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Submissions_StudentId_ActivityId",
                table: "Submissions",
                columns: new[] { "StudentId", "ActivityId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Activities");

            migrationBuilder.DropTable(
                name: "RealtimeClass");

            migrationBuilder.DropTable(
                name: "Submissions");

            migrationBuilder.CreateTable(
                name: "TeachingClass",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(256)", nullable: false),
                    CourseId = table.Column<string>(type: "varchar(256)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Description = table.Column<string>(type: "longtext", nullable: false),
                    From = table.Column<TimeOnly>(type: "time", nullable: false),
                    Identifier = table.Column<string>(type: "longtext", nullable: false),
                    OwnerId = table.Column<string>(type: "varchar(255)", nullable: false),
                    To = table.Column<TimeOnly>(type: "time", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeachingClass", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeachingClass_Courses_CourseId",
                        column: x => x.CourseId,
                        principalTable: "Courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_TeachingClass_CourseId",
                table: "TeachingClass",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_TeachingClass_OwnerId",
                table: "TeachingClass",
                column: "OwnerId");
        }
    }
}
