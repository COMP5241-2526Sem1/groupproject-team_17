using System;
using System.ComponentModel.DataAnnotations;

namespace InteractiveHub.Service.Logger;

public class LogMessage
{
    public enum LogLevel
    {
        INFO,
        WARN,
        ERROR,
        DEBUG
    }
    [Key]
    public string LogId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Source { get; set; } = string.Empty;
    public string Operator { get; set; } = "";
    public LogLevel Level { get; set; } = LogLevel.INFO;
    public string Message { get; set; } = string.Empty; // e.g., class or module name
    public string Service { get; set; } = "System";
    public LogMessage()
    {
        // Generate a unique LogId using current timestamp and a GUID
        LogId = $"{DateTime.UtcNow.ToString("yyyyMMdd")}.{Guid.NewGuid().ToString("N")}";
    }
    public static LogMessage Create(LogLevel level, string message,string source, string Operator , string service = "System")
    {
        return new LogMessage
        {
            Source = source,
            Level = level,
            Operator = Operator,
            Service = service,
            Message = message
        };
    }
}
