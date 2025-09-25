using System;
using System.ComponentModel;

namespace InteractiveHub.Service.ClassManagement;

public enum ClassResCode
{
    Success = 0,
    // avoid the conflict with http status code
    // start from 1000,

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
