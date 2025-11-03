using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InteractiveHub.Service.ClassRelated.Migrations
{
    /// <inheritdoc />
    public partial class AddAIActivityPreviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AIActivityPreviews",
                columns: table => new
                {
                    Id = table.Column<string>(type: "varchar(255)", nullable: false),
                    ConversationId = table.Column<string>(type: "varchar(255)", nullable: false),
                    ActivityType = table.Column<string>(type: "longtext", nullable: false),
                    ActivityDataJson = table.Column<string>(type: "text", nullable: false),
                    IsCreated = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedActivityId = table.Column<string>(type: "longtext", nullable: true),
                    Order = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIActivityPreviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AIActivityPreviews_AIConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "AIConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AIActivityPreviews_ConversationId",
                table: "AIActivityPreviews",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_AIActivityPreviews_ConversationId_Order",
                table: "AIActivityPreviews",
                columns: new[] { "ConversationId", "Order" });

            migrationBuilder.CreateIndex(
                name: "IX_AIActivityPreviews_IsCreated",
                table: "AIActivityPreviews",
                column: "IsCreated");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AIActivityPreviews");
        }
    }
}
