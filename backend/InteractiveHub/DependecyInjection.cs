using System;
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

        // HubLogger
        var connectionString = services.BuildServiceProvider()
            .GetService<IConfiguration>()?
            .GetConnectionString("MySqlConnection");
        if (string.IsNullOrEmpty(connectionString))
        {
            throw new ArgumentException("Connection string 'MySqlConnection' is not found in configuration.");
        }

        services.AddHubLogger(connectionString);
    }


    public static WebApplication UseInteractiveHubServices(this WebApplication app)
    {
        // Use other middlewares here as needed

        // Use HubLogger
        app.UseHubLogger();

        return app;
    }

}
