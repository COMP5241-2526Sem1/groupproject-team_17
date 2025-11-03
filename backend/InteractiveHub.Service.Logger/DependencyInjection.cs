using System;
using InteractiveHub.Service.Logger.Repository;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InteractiveHub.Service.Logger;

public static class DependencyInjection
{
    /// <summary>
    /// Add HubLogger service to the service collection
    /// </summary>
    /// <param name="services"></param>
    /// <param name="connectionString">
    /// MySQL connection string
    /// </param>
    /// <exception cref="ArgumentException">
    /// Thrown when connection string is null or empty
    /// </exception>
    public static IServiceCollection AddHubLogger(this IServiceCollection services, string? connectionString = null)
    {
        // throw error if connection string is null or empty
        if (string.IsNullOrEmpty(connectionString))
        {
            throw new ArgumentException("Connection string cannot be null or empty", nameof(connectionString));
        }

        // Register DbContext with MySQL provider
        services.AddDbContext<LoggerDbContext>(options =>
        {
            options.UseMySQL(connectionString);
        });

        // Register the HubLogger as a scoped service
        services.AddScoped<IHubLogger, HubLogger>();

        // Register HttpContextAccessor to access HttpContext in HubLogger
        services.AddHttpContextAccessor();
        return services;

    }



    /// <summary>
    /// Use HubLogger middleware in the application
    /// </summary>
    /// <param name="app"></param>
    /// <returns></returns>
    public static WebApplication UseHubLogger(this WebApplication app)
    {
        // Create a scope to get the DbContext instance
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LoggerDbContext>();
        db.Database.Migrate(); // Apply any pending migrations

        // Initialize the HubLogger with the service provider
        HubLogger.Initialize(app.Services);
        return app;
    }




}
