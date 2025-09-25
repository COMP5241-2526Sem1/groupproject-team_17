using System;
using InteractiveHub.Service;
using InteractiveHub.Service.Logger;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InteractiveHub;

public static class DependencyInjection
{
    public static void AddInteractiveHubServices(this IServiceCollection services)
    {
        // Add other service registrations here as needed
        // Get the connection string from appsettings.json

        // Get default connection string from configuration
        var serviceProvider = services.BuildServiceProvider();
        var configuration = serviceProvider.GetRequiredService<IConfiguration>();
        var connectionString = configuration.GetConnectionString("DefaultConnection");
 
        if (string.IsNullOrEmpty(connectionString))
        {
            throw new ArgumentException("Connection string 'DefaultConnection' is not found in configuration.");
        }

        services.AddHubLogger(connectionString);
    }


    public static WebApplication UseInteractiveHubServices(this WebApplication app)
    {
        // Use other middlewares here as needed

        // Use HubLogger
        app.UseHubLogger();
        // create a scope to get the logger instance
        using var scope = app.Services.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<IHubLogger>();
        logger.SetService("Interactive Hub");

        logger.LogInfo("Interactive Hub Service started");

        return app;
    }

}
