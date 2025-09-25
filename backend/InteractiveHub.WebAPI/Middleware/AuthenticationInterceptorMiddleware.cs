namespace InteractiveHub.WebAPI.Middleware;

public class AuthenticationInterceptorMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuthenticationInterceptorMiddleware> _logger;

    public AuthenticationInterceptorMiddleware(RequestDelegate next, ILogger<AuthenticationInterceptorMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        await _next(context);

        // 拦截 401 响应
        if (context.Response.StatusCode == 401)
        {
            _logger.LogWarning("401 Unauthorized intercepted for {Path} from {RemoteIpAddress}", 
                context.Request.Path, 
                context.Connection.RemoteIpAddress);

            // 检查是否已经写入响应
            if (!context.Response.HasStarted)
            {
                context.Response.ContentType = "application/json";
                
                var customResponse = new
                {
                    error = "Unauthorized",
                    message = "Authentication required to access this resource",
                    timestamp = DateTime.UtcNow,
                    path = context.Request.Path.Value,
                    traceId = context.TraceIdentifier
                };

                var json = System.Text.Json.JsonSerializer.Serialize(customResponse, new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
                });

                // 清除已有的响应内容
                context.Response.Body.SetLength(0);
                await context.Response.WriteAsync(json);
            }
        }
    }
}

public static class AuthenticationInterceptorMiddlewareExtensions
{
    public static IApplicationBuilder UseAuthenticationInterceptor(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<AuthenticationInterceptorMiddleware>();
    }
}