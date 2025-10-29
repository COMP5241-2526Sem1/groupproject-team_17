using InteractiveHub;
using InteractiveHub.Service.Logger;
using InteractiveHub.WebAPI.Middleware;
using Microsoft.OpenApi.Models;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using InteractiveHub.Service;
using InteractiveHub.WebAPI;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers(options =>
{
    options.Filters.Add<BadRequestActionFilter>();
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://{builder.Configuration["Auth0:Domain"]}/";
        options.Audience = builder.Configuration["Auth0:Audience"];
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = $"https://{builder.Configuration["Auth0:Domain"]}/",
            ValidAudience = builder.Configuration["Auth0:Audience"]
        };

        // intercept immediately during token validation
        options.Events = new JwtBearerEvents
        {
            OnChallenge = context =>
            {
                // intercept authentication challenge immediately, preventing default handler from processing
                context.HandleResponse();

                // log authentication failure
                var logger = context.HttpContext.RequestServices.GetService<IHubLogger>();
                logger?.LogWarning("Token validation failed - Path: {Path}, TraceId: {TraceId}",
                    context.Request.Path, context.HttpContext.TraceIdentifier);

                // set custom response immediately
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json; charset=utf-8";

                var errorResponse = new HttpResult
                (
                    (int)ResCode.Unauthorized,
                    null,
                    "Authentication failed: Invalid or missing token"

                );

                var json = System.Text.Json.JsonSerializer.Serialize(errorResponse, new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    WriteIndented = true
                });

                return context.Response.WriteAsync(json);
            },
        };
    });

#region Swagger
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "InteractiveHub.WebAPI", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Input : Bearer {你的JWT}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
#endregion

builder.Services.AddInteractiveHubServices(); // Add the HubLogger service

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: "Allow_All", builderx =>
    {
        builderx.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });

});
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "InteractiveHub API v1");
        c.DisplayRequestDuration();
    });
}

app.UseCors("Allow_All");

app.UseHttpsRedirection();

app.UseCustomTraceIdentifier(); // Add custom TraceIdentifier middleware

app.UseInteractiveHubServices(); // Add the HubLogger middleware

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.UseWebSockets(new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromSeconds(120),
});

app.Run();
