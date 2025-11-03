using System;
using System.Globalization;
using System.Net;
using InteractiveHub.Service;
using Microsoft.AspNetCore.Mvc;

namespace InteractiveHub.WebAPI;

public class IHControllerBase : ControllerBase
{
    private readonly IHubLogger _log;
    public IHControllerBase(IHubLogger logger)
    {
        _log = logger;
    }


    [NonAction]
    public IActionResult ReturnResponse(ServiceRes res, object? data = null, string? message = null)
    {
        var httpResult = new HttpResult((int)res.Code, data, message ?? res.Message, traceId: res.TraceId);

        return res.Code switch
        {

            ResCode.OK => Ok(httpResult),

            _ => StatusCode((int)res.httpStatusCode, httpResult),
        };
    }

    [NonAction]
    public IActionResult ReturnOK(object? data = null, string? message = null)
    {
        var httpResult = new HttpResult((int)ResCode.OK, data, message ?? "Success");
        return Ok(httpResult);
    }

    protected async Task<IActionResult> HandleWithResultAsync(Func<Task<IActionResult>> action, string messageIfError = "Internal server error")
    {
        try
        {
            return await action();
        }
        catch (Exception ex)
        {
            _log.LogError($"An error occurred: {ex.Message}");
            return StatusCode(500, new HttpResult((int)ResCode.InternalError, null, messageIfError));
        }
    }

}
