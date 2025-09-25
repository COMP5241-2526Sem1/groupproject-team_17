using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace InteractiveHub.Service.Logger.Repository;

// User for creating DbContext instances

//dotnet ef migrations add InitialCreate --project Service/InteractiveHub.Service.Logger/InteractiveHub.Service.Logger.csproj
public class LoggerDbContextFactory : IDesignTimeDbContextFactory<LoggerDbContext>
{
    public LoggerDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<LoggerDbContext>();
        // MySQL 連線字串範例


        optionsBuilder.UseMySQL("Server=localhost;Database=authdb;User=root;Password=yourpassword;");

        return new LoggerDbContext(optionsBuilder.Options);
    }
}
