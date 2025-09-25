using System;
using System.ComponentModel;

namespace InteractiveHub.Service;



public struct ServiceRes
{
    public ResCode Code { get; set; }
    public string Message { get; set; }
    public string TraceId { get; set; } = "";

    public ServiceRes(ResCode code, string? message = null, string? traceId= null)
    {
        Code = code;
        Message = message ?? "";
        TraceId = traceId ?? "";
    }
}

public enum ResCode
{
    OK = 0,
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

}
