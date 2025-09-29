using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

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
    [JsonIgnore]
    public List<TeachingClass> Classes { get; set; } = new List<TeachingClass>();


    [JsonIgnore]
    public List<Student> Students { get; set; } = new List<Student>();
    [NotMapped]
    public List<StudentSimpleDto> StudentsDto => Students.Select(s => new StudentSimpleDto
    {
        Id = s.Id,
        StudentId = s.StudentId,
        FullName = s.FullName,
        Email = s.Email,
        PIN = s.PIN
    }).ToList();
    public TeachingCourse() : base()
    {
        //extract short id from guid

        var guid = Guid.NewGuid().ToString("N");
        Id = $"crs.{guid.Substring(0, 12)}";

    }
    public TeachingCourseDto ToDto()
    {
        return new TeachingCourseDto
        {
            Id = Id,
            IsEnabled = IsEnabled,
            IsArchived = IsArchived,
            AcademicYear = AcademicYear,
            Semester = Semester,
            CourseCode = CourseCode,
            CourseName = CourseName,
            Description = Description,
            ClassCount = Classes.Count,
            StudentCount = Students.Count,
            Students = StudentsDto.ToArray()
        };
    }
}

public class TeachingCourseDto
{
    public string Id { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public bool IsArchived { get; set; } = false;
    public int AcademicYear { get; set; } = 2025;
    public TeachingCourse.SemesterEnum Semester { get; set; }
    public string CourseCode { get; set; } = string.Empty;
    public string CourseName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int ClassCount { get; set; } = 0;
    public int StudentCount { get; set; } = 0;

    public StudentSimpleDto[] Students { get; set; } = Array.Empty<StudentSimpleDto>();
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

