using System;
using System.ComponentModel.DataAnnotations;

namespace InteractiveHub.Service.Logger;

public class LogTrace
{

    [Key]
    public int Id { get; set; }
    public string LogId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string? Message { get; set; }
    public string StackTrace { get; set; } = string.Empty;

    public LogTrace() { }
    public static LogTrace Create(string logId, string message,Exception? ex)
    {
        return new LogTrace
        {
            LogId = logId,
            Timestamp = DateTime.UtcNow,
            Message = message,
            StackTrace = ex?.StackTrace ?? string.Empty
        };
    }
}
