using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace InteractiveHub.Service.ClassManagement.Repository;

// User for creating DbContext instances

//dotnet ef migrations add InitialCreate --output-dir ClassManagement/Db/Migrations --context ClassDbContext
public class ClassDbContextFactory : IDesignTimeDbContextFactory<ClassDbContext>
{
    public ClassDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ClassDbContext>();
        // MySQL 連線字串範例


        optionsBuilder.UseMySQL("Server=localhost;Database=authdb;User=root;Password=yourpassword;");

        return new ClassDbContext(optionsBuilder.Options);
    }
}
