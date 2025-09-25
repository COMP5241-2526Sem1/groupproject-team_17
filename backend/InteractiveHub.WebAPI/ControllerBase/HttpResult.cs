using System;

namespace InteractiveHub.WebAPI;

public class HttpResult
{
    public int ResCode { get; set; }
    public object? Data { get; set; }
    public string? Message { get; set; }

    public string? TraceId { get; set; }

    public HttpResult(int resCode, object? data = null, string? message = null, string? traceId = null)
    {
        ResCode = resCode;
        Data = data;
        Message = message;
        TraceId = traceId;
    }
}
public class HttpResult<T> : HttpResult
{
    public new T? Data { get; set; }

    public HttpResult(int resCode, T? data = default, string? message = null, string? traceId = null)
        : base(resCode, data, message, traceId)
    {
        Data = data;
    }
}
