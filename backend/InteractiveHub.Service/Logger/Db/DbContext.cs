using System;
using Microsoft.EntityFrameworkCore;

namespace InteractiveHub.Service.Logger.Repository;

// Go to the solution directory first
// dotnet ef migrations add InitialCreate --project Service/InteractiveHub.Service/InteractiveHub.Service.csproj --output-dir Services/LogManager/Db/Migrations --context LoggerDbContext

// DbContext for logging
public class LoggerDbContext : DbContext
{
    public DbSet<LogMessage> LogMessages { get; set; }
    public DbSet<LogTrace> LogTraces { get; set; }
    public LoggerDbContext(DbContextOptions<LoggerDbContext> options) : base(options)
    {
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {

    }
}
