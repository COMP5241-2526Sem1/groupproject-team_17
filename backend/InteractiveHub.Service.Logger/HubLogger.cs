using System.Collections.Concurrent;
using InteractiveHub.Service.Logger.Repository;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace InteractiveHub.Service.Logger;


//Scoped service for logging
//but the actual implementation can be swapped out
public partial class HubLogger : IHubLogger
{
    private string service = "System";
    public string Service => service;
    // only address without port
    public string RemoteIpAddress => _httpContext?.Connection.RemoteIpAddress?.ToString() ?? "";
    public void SetService(string serviceName)
    {
        service = serviceName;
    }

    public string OwnerId => _httpContext?.User?.FindFirst("sub")?.Value ?? "";


    public string TraceId => _httpContext?.TraceIdentifier ?? "";
    private readonly HttpContext? _httpContext;
    public HubLogger(IHttpContextAccessor httpContextAccessor)
    {
        _httpContext = httpContextAccessor.HttpContext ?? null;
    }

    public string LogInfo(string message, string? source = null, string? Operator = null)
    {
        var logMessage = LogMessage.Create(LogMessage.LogLevel.INFO, message, source ?? RemoteIpAddress, Operator ?? OwnerId, Service);
        if (!string.IsNullOrWhiteSpace(TraceId) && _httpContext != null)
        {
            logMessage.LogId = TraceId;
        }
        messageQueue.Enqueue(logMessage);
        return logMessage.LogId;
    }
    public string LogError(string message, string? source = null, Exception? ex = null, string? Operator = null)
    {
        var logMessage = LogMessage.Create(LogMessage.LogLevel.ERROR, message + (ex != null ? $" Exception: {ex.Message}" : ""), RemoteIpAddress, Operator ?? OwnerId, Service);
        if (!string.IsNullOrWhiteSpace(TraceId) && _httpContext != null)
        {
            logMessage.LogId = TraceId;
        }

        messageQueue.Enqueue(logMessage);
        if (ex != null)
        {
            var logTrace = LogTrace.Create(logMessage.LogId, message, ex);
            traceQueue.Enqueue(logTrace);
        }
        return logMessage.LogId;
        // Implementation for logging error messages
    }
    public string LogWarning(string message,string? source = null , string? Operator = null)
    {
        var logMessage = LogMessage.Create(LogMessage.LogLevel.WARN, message, RemoteIpAddress, Operator ?? OwnerId, Service);
        if (!string.IsNullOrWhiteSpace(TraceId) && _httpContext != null)
        {
            logMessage.LogId = TraceId;
        }

        messageQueue.Enqueue(logMessage);
        return logMessage.LogId;
    }
}


public partial class HubLogger
{
    private static IServiceProvider? _serviceProvider = null;
    
    //private static LoggerDbContext? dbContext = null;
    private static readonly CancellationTokenSource _cancellationTokenSource = new CancellationTokenSource();
    private static readonly ConcurrentQueue<LogMessage> messageQueue = new ConcurrentQueue<LogMessage>();
    private static readonly ConcurrentQueue<LogTrace> traceQueue = new ConcurrentQueue<LogTrace>();
    private static readonly object _lock = new object();
    public static void Initialize(IServiceProvider provider)
    {
        _serviceProvider = provider;
        Start();

    }
    private static void Start()
    {
        // Start the timer or background task
        Task.Run(async () =>
        {
            while (true)
            {
                if (_cancellationTokenSource.Token.IsCancellationRequested)
                {
                    break;
                }
                await Task.Delay(TimeSpan.FromSeconds(5));
                try
                {
                    await OnTimer();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error in LogManager timer: {ex.Message}");
                    // Handle exceptions
                }
            }
        }, _cancellationTokenSource.Token);
    }
    public static void Stop()
    {
        // Stop the timer or background task
        _cancellationTokenSource.Cancel();
    }
    public static IEnumerable<LogMessage> RetrieveLogMessages()
    {
        var logs = new List<LogMessage>();
        while (messageQueue.TryDequeue(out var log))
        {
            logs.Add(log);
        }
        return logs;
    }
    public static IEnumerable<LogTrace> RetrieveLogTraces()
    {
        var traces = new List<LogTrace>();
        while (traceQueue.TryDequeue(out var trace))
        {
            traces.Add(trace);
        }
        return traces;
    }
    public static async Task OnTimer()
    {
        using var scope = _serviceProvider?.CreateScope();

        var db = scope?.ServiceProvider.GetService<LoggerDbContext>();
        if (db == null)
        {
            Stop();
            return;
        }
        IEnumerable<LogMessage> logs = Enumerable.Empty<LogMessage>();
        IEnumerable<LogTrace> traces = Enumerable.Empty<LogTrace>();
        try
        {
            logs = RetrieveLogMessages();
            if (logs.Any())
            {
                if (db != null)
                {
                    await db.AddRangeAsync(logs);
                    await db.SaveChangesAsync();
                }
            }
        }
        catch (Exception)
        {
            if (logs.Any())
            {
                //logs.Append(LogMessage.Create(LogMessage.LogLevel.ERROR, $"Error occurred while processing logs: {ex.Message}", ""));
                SaveLogToFile(logs);
            }
            // SaveLogsToFile(logs);
        }

        try
        {
            traces = RetrieveLogTraces();
            if (traces.Any())
            {
                if (db != null)
                {
                    await db.AddRangeAsync(traces);
                    await db.SaveChangesAsync();
                }
                // Process the traces, e.g., write to a file or database
               // await Task.CompletedTask; // Simulate async operation
            }
        }
        catch (Exception)
        {
            if (traces.Any())
            {
                SaveTracesToFile(traces);
            }
            // Handle exceptions
            //Console.WriteLine($"Error processing log traces: {ex.Message}");
        }

    }


    public static void SaveLogToFile(IEnumerable<LogMessage> logs)
    {
        List<LogMessage> logList = logs.ToList();
        // For the folder Logs
        var logDirectory = Path.Combine(AppContext.BaseDirectory, "Logs");
        if (!Directory.Exists(logDirectory))
        {
            Directory.CreateDirectory(logDirectory);
        }

        // Implementation for saving logs to a file
        // This is a placeholder implementation
        var fileName = $"logs_{DateTime.UtcNow:yyyyMMdd}.txt";
        var logFilePath = Path.Combine(logDirectory, fileName);
        // Load existing logs if the file exists
        if (File.Exists(logFilePath))
        {
            var existingLogsJson = File.ReadAllText(logFilePath);
            var existingLogs = System.Text.Json.JsonSerializer.Deserialize<List<LogMessage>>(existingLogsJson);
            if (existingLogs != null)
            {
                logList.AddRange(existingLogs);
            }
            //add 

            // Do something with the existing logs, e.g., deserialize and process them
        }
        logList.AddRange(logs);
        var json = System.Text.Json.JsonSerializer.Serialize(logList, options: new System.Text.Json.JsonSerializerOptions
        {
            WriteIndented = true
        });
        File.WriteAllText(logFilePath, json);
    }
    public static void SaveTracesToFile(IEnumerable<LogTrace> traces)
    {
        List<LogTrace> traceList = traces.ToList();

        // For the folder Logs
        var traceDirectory = Path.Combine(AppContext.BaseDirectory, "Logs");
        if (!Directory.Exists(traceDirectory))
        {
            Directory.CreateDirectory(traceDirectory);
        }

        // Implementation for saving traces to a file
        // This is a placeholder implementation
        var fileName = $"traces_{DateTime.UtcNow:yyyyMMdd}.txt";
        var traceFilePath = Path.Combine(traceDirectory, fileName);
        // Load existing traces if the file exists
        if (File.Exists(traceFilePath))
        {
            var existingTracesJson = File.ReadAllText(traceFilePath);
            var existingTraces = System.Text.Json.JsonSerializer.Deserialize<List<LogTrace>>(existingTracesJson);
            if (existingTraces != null)
            {
                traceList.AddRange(existingTraces);
            }
        }
        traceList.AddRange(traces);
        var json = System.Text.Json.JsonSerializer.Serialize(traceList, options: new System.Text.Json.JsonSerializerOptions
        {
            WriteIndented = true
        });
        File.WriteAllText(traceFilePath, json);
    }
}
