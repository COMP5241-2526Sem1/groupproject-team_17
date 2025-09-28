using System;
using System.ComponentModel.DataAnnotations;

namespace InteractiveHub.Service.ClassManagement;


public class TeachingCourse : IHObject
{
    public enum SemesterEnum
    {
        None = 0,
        One = 1,
        Two = 2,
        Summer = 3
    }
    public bool IsEnabled { get; set; } = true;
    public bool IsArchived { get; set; } = false;
    public int AcademicYear { get; set; } = 2025;
    public SemesterEnum Semester { get; set; }
    public string CourseCode { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<TeachingClass> Classes { get; set; } = new List<TeachingClass>();
    public List<Student> Students { get; set; } = new List<Student>();
    public TeachingCourse() : base()
    {
        //extract short id from guid

        var guid = Guid.NewGuid().ToString("N");
        Id = $"crs.{guid.Substring(0, 12)}";

    }

}
public class CreateCourseRequest
{
    [Required]
    public int? AcademicYear { get; set; }
    [Required]
    public TeachingCourse.SemesterEnum Semester { get; set; }
    [Required]
    public string? CourseCode { get; set; }
    [Required]
    public string? CourseName { get; set; }
    public string? Description { get; set; }
}
public class UpdateCourseRequest
{
    public int? AcademicYear { get; set; }
    public TeachingCourse.SemesterEnum? Semester { get; set; }
    public string? CourseCode { get; set; }
    public string? CourseName { get; set; }
    public string? Description { get; set; }
}

