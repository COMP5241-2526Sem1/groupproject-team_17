using System;
using Microsoft.EntityFrameworkCore;

namespace InteractiveHub.Service.ClassManagement.Repository;

public class ClassDbContext : DbContext
{
    public DbSet<Student> Students { get; set; } = null!;
    public DbSet<TeachingCourse> Courses { get; set; } = null!;
    //public DbSet<TeachingClass> Classes { get; set; } = null!;
    public ClassDbContext(DbContextOptions<ClassDbContext> options) : base(options)
    {
        
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Unique constraint on CourseCode, AcademicYear, Semester, and OwnerId
        modelBuilder.Entity<TeachingCourse>()
            .HasIndex(c => new { c.CourseCode, c.AcademicYear, c.Semester, c.OwnerId })
            .IsUnique();
        // Unique constraint on Student,  OwnerId, StudentId
        modelBuilder.Entity<Student>()
            .HasIndex(s => new { s.StudentId, s.OwnerId })
            .IsUnique();
        // One-to-Many between TeachingCourse and TeachingClass
        modelBuilder.Entity<TeachingCourse>()
            .HasMany(c => c.Classes)
            .WithOne()
            .HasForeignKey(tc => tc.CourseId);
        // Many-to-Many between Student and TeachingCourse
        modelBuilder.Entity<Student>()
            .HasMany(s => s.Courses)
            .WithMany(c => c.Students);
    }
}
