using System.ComponentModel;

namespace InteractiveHub;


public class ServiceException : Exception
{
    public int Code { get; set; }
    public bool InternalError { get; private set; } = false;
    public string ErrorDescription { get; set; } = string.Empty;

    public string TraceId { get; set; } = string.Empty;

    public ServiceException(Enum code, string? message = null, string? traceId = null, bool internalError = false) : base(message)
    {
        InternalError = internalError;
        Code = (int)(object)code;
        TraceId = "";
        // get the discption from enum if message is null
        var fieldInfo = code.GetType().GetField(code.ToString());
        var attribute = fieldInfo?.GetCustomAttributes(typeof(DescriptionAttribute), false)
            .FirstOrDefault() as DescriptionAttribute;
        var Description = attribute?.Description ?? string.Empty;
        if (string.IsNullOrEmpty(message) && !string.IsNullOrEmpty(Description))
        {
            Description = $"{Description}, {message}";
        }
        ErrorDescription = "Unknown error occurred.";
    }
}
