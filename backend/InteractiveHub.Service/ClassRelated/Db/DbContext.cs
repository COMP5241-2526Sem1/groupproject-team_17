using System;
using Microsoft.EntityFrameworkCore;

namespace InteractiveHub.Service.ClassManagement.Repository;

public class ClassDbContext : DbContext
{
    public DbSet<Student> Students { get; set; } = null!;
    public DbSet<TeachingCourse> Courses { get; set; } = null!;
    public DbSet<Activity> Activities { get; set; } = null!;
    public DbSet<Submission> Submissions { get; set; } = null!;

    // AI Assistant conversation tables
    public DbSet<AIConversation> AIConversations { get; set; } = null!;
    public DbSet<AIConversationMessage> AIConversationMessages { get; set; } = null!;
    public DbSet<AIActivityPreview> AIActivityPreviews { get; set; } = null!;
    public DbSet<AIPdfFile> AIPdfFiles { get; set; } = null!;

    //public DbSet<TeachingClass> Classes { get; set; } = null!
    public ClassDbContext(DbContextOptions<ClassDbContext> options) : base(options)
    {

    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Unique constraint on CourseCode, AcademicYear, Semester, and OwnerId
        modelBuilder.Entity<TeachingCourse>()
            .HasIndex(c => new { c.CourseCode, c.AcademicYear, c.Semester, c.OwnerId })
            .IsUnique();

        // Unique constraint on Student, OwnerId, StudentId
        modelBuilder.Entity<Student>()
            .HasIndex(s => new { s.StudentId, s.OwnerId })
            .IsUnique();

        // One-to-Many between TeachingCourse and TeachingClass
        // Commented out until TeachingClass table is created
        // modelBuilder.Entity<TeachingCourse>()
        //     .HasMany(c => c.Classes)
        //     .WithOne()
        //     .HasForeignKey(tc => tc.CourseId);

        // Many-to-Many between Student and TeachingCourse
        modelBuilder.Entity<Student>()
            .HasMany(s => s.Courses)
            .WithMany(c => c.Students);

        // Configure TPH (Table Per Hierarchy) for Activity
        modelBuilder.Entity<Activity>()
            .HasDiscriminator<ActivityType>("Type")
            .HasValue<Quiz>(ActivityType.Quiz)
            .HasValue<Poll>(ActivityType.Polling)
            .HasValue<Discussion>(ActivityType.Discussion);

        // Mark Activity as abstract (cannot be instantiated directly)
        modelBuilder.Entity<Activity>()
            .UseTphMappingStrategy();

        // Index for Activity performance
        modelBuilder.Entity<Activity>()
            .HasIndex(a => a.CourseId);

        modelBuilder.Entity<Activity>()
            .HasIndex(a => new { a.CourseId, a.IsActive });

        // Configure relationship: Activity -> Submissions (One-to-Many with Cascade Delete)
        modelBuilder.Entity<Activity>()
            .HasMany<Submission>()
            .WithOne()
            .HasForeignKey(s => s.ActivityId)
            .OnDelete(DeleteBehavior.Cascade); // When Activity is deleted, delete all related Submissions

        // Configure TPH (Table Per Hierarchy) for Submission
        modelBuilder.Entity<Submission>()
            .HasDiscriminator<ActivityType>("Type")
            .HasValue<QuizSubmission>(ActivityType.Quiz)
            .HasValue<PollSubmission>(ActivityType.Polling)
            .HasValue<DiscussionSubmission>(ActivityType.Discussion);

        // Mark Submission as abstract (cannot be instantiated directly)
        modelBuilder.Entity<Submission>()
            .UseTphMappingStrategy();

        // Index for Submission performance
        modelBuilder.Entity<Submission>()
            .HasIndex(s => s.ActivityId);

        modelBuilder.Entity<Submission>()
            .HasIndex(s => new { s.StudentId, s.ActivityId });

        modelBuilder.Entity<Submission>()
            .HasIndex(s => new { s.CourseId, s.ActivityId });

        // Configure AI Conversation relationships and indexes
        modelBuilder.Entity<AIConversation>()
            .HasIndex(c => c.CourseId);

        modelBuilder.Entity<AIConversation>()
            .HasIndex(c => c.InstructorId);

        modelBuilder.Entity<AIConversation>()
            .HasIndex(c => new { c.InstructorId, c.CourseId, c.IsCompleted });

        // Configure relationship: AIConversation -> AIConversationMessages (One-to-Many with Cascade Delete)
        modelBuilder.Entity<AIConversation>()
            .HasMany<AIConversationMessage>()
            .WithOne(m => m.Conversation)
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AIConversationMessage>()
            .HasIndex(m => m.ConversationId);

        modelBuilder.Entity<AIConversationMessage>()
            .HasIndex(m => new { m.ConversationId, m.Order });

        // Configure relationship: AIConversation -> AIActivityPreviews (One-to-Many with Cascade Delete)
        modelBuilder.Entity<AIConversation>()
            .HasMany<AIActivityPreview>()
            .WithOne(p => p.Conversation)
            .HasForeignKey(p => p.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AIActivityPreview>()
            .HasIndex(p => p.ConversationId);

        modelBuilder.Entity<AIActivityPreview>()
            .HasIndex(p => new { p.ConversationId, p.Order });

        modelBuilder.Entity<AIActivityPreview>()
            .HasIndex(p => p.IsCreated);

        // Configure relationship: AIConversation -> AIPdfFiles (One-to-Many with Cascade Delete)
        modelBuilder.Entity<AIConversation>()
            .HasMany<AIPdfFile>()
            .WithOne(p => p.Conversation)
            .HasForeignKey(p => p.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AIPdfFile>()
            .HasIndex(p => p.ConversationId);
    }
}
