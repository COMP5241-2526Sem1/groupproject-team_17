namespace InteractiveHub.WebAPI.Middleware;

public class TraceIdentifierMiddleware
{
    private readonly RequestDelegate _next;

    public TraceIdentifierMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Option 1: Use a custom format with timestamp + random
        context.TraceIdentifier = $"IH-{DateTimeOffset.UtcNow:yyyyMMdd.HHmmss}-{Guid.NewGuid().ToString("N")[..8]}";
        
        // Option 2: Use just a GUID
        // context.TraceIdentifier = Guid.NewGuid().ToString();
        
        // Option 3: Use a custom prefix with original identifier
        // context.TraceIdentifier = $"InteractiveHub-{context.TraceIdentifier}";
        
        // Option 4: Extract from headers (e.g., X-Correlation-ID)
        // if (context.Request.Headers.TryGetValue("X-Correlation-ID", out var correlationId))
        // {
        //     context.TraceIdentifier = correlationId.FirstOrDefault() ?? context.TraceIdentifier;
        // }

        await _next(context);
    }
}

// Extension method to register the middleware
public static class TraceIdentifierMiddlewareExtensions
{
    public static IApplicationBuilder UseCustomTraceIdentifier(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<TraceIdentifierMiddleware>();
    }
}