using System;
using System.ComponentModel;
using System.Net;

namespace InteractiveHub.Service;



public struct ServiceRes
{
    public HttpStatusCode httpStatusCode { get; set; } = HttpStatusCode.OK;
    public ResCode Code { get; set; }
    public string Message { get; set; }
    public string TraceId { get; set; } = "";

    public ServiceRes(ResCode code, string? message = null, string? traceId = null, HttpStatusCode httpStatusCode = HttpStatusCode.OK)
    {
        Code = code;
        Message = message ?? "";
        TraceId = traceId ?? "";
        this.httpStatusCode = httpStatusCode;
    }

    public static ServiceRes OK(string? message = null, string? traceId = null)
    {
        return new ServiceRes(ResCode.OK, message, traceId, HttpStatusCode.OK);
    }


    public static ServiceRes BadRequest(ResCode code, string? message = null, string? traceId = null)
    {
        return new ServiceRes(code, message, traceId, HttpStatusCode.BadRequest);
    }
    public static ServiceRes Conflict(ResCode code, string? message = null, string? traceId = null)
    {
        return new ServiceRes(code, message, traceId, HttpStatusCode.Conflict);
    }
    public static ServiceRes NotFound(ResCode code, string? message = null, string? traceId = null)
    {
        return new ServiceRes(code, message, traceId, HttpStatusCode.NotFound);
    }
    public static ServiceRes InternalError(ResCode code, string? message = null, string? traceId = null)
    {
        return new ServiceRes(code, message, traceId, HttpStatusCode.InternalServerError);
    }
    public static ServiceRes Unauthorized(ResCode code, string? message = null, string? traceId = null)
    {
        return new ServiceRes(code, message, traceId, HttpStatusCode.Unauthorized);
    }



}

public enum ResCode
{
    OK = 0,

    [Description("Unauthorized access.")]
    Unauthorized = 401,


    [Description("An internal error occurred.")]
    InternalError = 500,
    // reserve 1-999 for http status code

    [Description("A database error occurred.")]
    DatabaseError = 1000,
    [Description("The owner is missing.")]
    OwnerIdMissing = 1001,


    [Description("The student already exists.")]
    StudentAlreadyExists,
    [Description("The student was not found.")]
    StudentNotFound,
    [Description("Invalid student data.")]
    InvalidStudentData,

    [Description("The course already exists.")]
    CourseAlreadyExists,
    [Description("The course was not found.")]
    CourseNotFound,
    [Description("Invalid course data.")]
    InvalidCourseData,
    [Description("The required field is missing.")]
    CourseRequiredFieldMissing,

    [Description("The class already exists.")]
    ClassAlreadyExists,
    [Description("Invalid course operation.")]
    InvalidCourseOperation,


    [Description("The class cannot be created.")]
    ClassCannotBeCreated,
    [Description("The class was not found.")]
    ClassNotFound,
    [Description("Invalid class data.")]
    InvalidClassData,

    [Description("Invalid pagination parameters.")]
    InvalidPaginationParameters,

}
