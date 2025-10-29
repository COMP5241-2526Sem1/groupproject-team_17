using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace InteractiveHub.Service.ClassManagement.Repository;

// User for creating DbContext instances

//dotnet ef migrations add ClassDbContextV8 --output-dir ClassRelated/Migrations --context ClassDbContext
public class ClassDbContextFactory : IDesignTimeDbContextFactory<ClassDbContext>
{
    public ClassDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ClassDbContext>();
        // MySQL connection string - matches appsettings.json
        optionsBuilder.UseMySQL("server=localhost;database=DevInteractiveHubDB;user=root;password=1qaz3edc");

        return new ClassDbContext(optionsBuilder.Options);
    }
}
