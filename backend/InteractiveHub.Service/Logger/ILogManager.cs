using System;

namespace InteractiveHub.Service;

using System;

public interface IHubLogger
{
    string Service { get; }
    string RemoteIpAddress { get; }
    void SetService(string serviceName);
    string LogInfo(string message, string? source = null, string? Operator = null);
    string LogError(string message, string? source = null, Exception? ex = null, string? Operator = null);
    string LogWarning(string message, string? source = null, string? Operator = null);
}

