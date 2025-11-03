using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace InteractiveHub.Service.ClassManagement;

[Table("Students")]
public class Student : IHObject
{
    public string StudentId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string NickName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PIN { get; set; } = string.Empty;
    [JsonIgnore]
    public List<TeachingCourse> Courses { get; set; } = new List<TeachingCourse>();
    public Student() : base()
    {
        //extract short id from guid

        var guid = Guid.NewGuid().ToString("N");
        Id = $"std.{guid.Substring(0, 12)}";

    }

}


public class CreateStudentDto
{
    [Required]
    public string StudentId { get; set; } = null!;
    public string? FullName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? NickName { get; set; }
    public string? Email { get; set; }

    public string? PIN { get; set; }
}

public class StudentSimpleDto
{
    public string Id { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PIN { get; set; } = string.Empty;

}
