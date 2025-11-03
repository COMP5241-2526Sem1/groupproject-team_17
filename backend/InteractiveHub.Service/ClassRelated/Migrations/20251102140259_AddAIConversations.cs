using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InteractiveHub.Service.ClassRelated.Migrations
{
    /// <inheritdoc />
    public partial class AddAIConversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AIConversations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(255)", nullable: false),
                    CourseId = table.Column<string>(type: "varchar(255)", nullable: false),
                    InstructorId = table.Column<string>(type: "varchar(255)", nullable: false),
                    ActivityType = table.Column<string>(type: "longtext", nullable: false),
                    Title = table.Column<string>(type: "longtext", nullable: false),
                    IsCompleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    GeneratedActivityId = table.Column<string>(type: "longtext", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIConversations", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AIConversationMessages",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(255)", nullable: false),
                    ConversationId = table.Column<string>(type: "varchar(255)", nullable: false),
                    Role = table.Column<string>(type: "longtext", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    PdfContent = table.Column<string>(type: "text", nullable: true),
                    Order = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIConversationMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AIConversationMessages_AIConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "AIConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "AIPdfFiles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(255)", nullable: false),
                    ConversationId = table.Column<string>(type: "varchar(255)", nullable: false),
                    FileName = table.Column<string>(type: "longtext", nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    ExtractedText = table.Column<string>(type: "text", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIPdfFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AIPdfFiles_AIConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "AIConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AIConversationMessages_ConversationId",
                table: "AIConversationMessages",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_AIConversationMessages_ConversationId_Order",
                table: "AIConversationMessages",
                columns: new[] { "ConversationId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_AIConversations_CourseId",
                table: "AIConversations",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_AIConversations_InstructorId",
                table: "AIConversations",
                column: "InstructorId");

            migrationBuilder.CreateIndex(
                name: "IX_AIConversations_InstructorId_CourseId_IsCompleted",
                table: "AIConversations",
                columns: new[] { "InstructorId", "CourseId", "IsCompleted" });

            migrationBuilder.CreateIndex(
                name: "IX_AIPdfFiles_ConversationId",
                table: "AIPdfFiles",
                column: "ConversationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AIConversationMessages");

            migrationBuilder.DropTable(
                name: "AIPdfFiles");

            migrationBuilder.DropTable(
                name: "AIConversations");
        }
    }
}
