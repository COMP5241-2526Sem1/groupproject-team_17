using InteractiveHub;

namespace InteractiveHub.Service;

public abstract class Submission : IHObject
{
  public string CourseId { get; set; } = string.Empty;
  public string StudentId { get; set; } = string.Empty;
  public string ActivityId { get; set; } = string.Empty;
  public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
  public ActivityType Type { get; set; } = ActivityType.Quiz;

  protected Submission()
  {
    Id = $"sub.{Guid.NewGuid().ToString("N")[..12]}";
  }
}
