using System;
using Microsoft.AspNetCore.Http;

namespace InteractiveHub.Service;

public abstract class ServiceBase
{
    private string _serviceName = "IH Service";
    protected readonly IHubLogger? _log;
    protected readonly HttpContext? _httpContext;
    protected string RequestSource => _httpContext?.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

    protected string OwnerId => _httpContext?.User?.FindFirst("sub")?.Value ?? "";



    public ServiceBase(IHubLogger? logManager, IHttpContextAccessor? httpContextAccessor = null)
    {
        _log = logManager;
        _httpContext = httpContextAccessor?.HttpContext;

    }

    protected virtual bool EnsureHasOwner(string messageIfMissing = "Unknown owner.")
    {
        return true;
    }
    protected void SetServiceName(string name)
    {
        _serviceName = name;
    }

}
