using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace InteractiveHub.Service;

public abstract class ServiceBase
{
    private string _serviceName = "IH Service";
    protected readonly IHubLogger? _log;
    protected readonly HttpContext? _httpContext;
    protected string RequestSource => _httpContext?.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
    // name identifier claim type is used to store user id
    // https://learn.microsoft.com/en-us/dotnet/api/system.security.claims.claimtypes.nameidentifier?view=net-7.0
    protected string OwnerId => _httpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "";



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
        _log?.SetService(name);
        _serviceName = name;
    }

}
