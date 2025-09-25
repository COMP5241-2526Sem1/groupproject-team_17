using System;
using InteractiveHub.Service.ClassManagement.Repository;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InteractiveHub.Service.ClassManagement;

public static class DependencyInjection
{
    public static IServiceCollection AddClassManager(this IServiceCollection services, string? connectionString = null)
    {
        if (string.IsNullOrEmpty(connectionString))
        {
            throw new ArgumentException("Connection string cannot be null or empty", nameof(connectionString));
        }

        services.AddDbContext<ClassDbContext>(options =>
        {
            options.UseMySQL(connectionString);
        });

        services.AddScoped<IClassManager, ClassManager>();

        return services;
    }

    public static WebApplication UseClassManager(this WebApplication app)
    {
        ClassManager.Initialize(app);
        return app;
    }
}
