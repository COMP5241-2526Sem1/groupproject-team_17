using InteractiveHub;

namespace InteractiveHub.Service;

public enum ActivityType
{
  Quiz = 1,
  Polling,
  Discussion,
}

public abstract class Activity : IHObject
{
  public string CourseId { get; set; } = string.Empty;
  public string Title { get; set; } = string.Empty;
  public string Description { get; set; } = string.Empty;
  public ActivityType Type { get; set; } = ActivityType.Quiz;
  public DateTime? ExpiresAt { get; set; }
  public bool IsActive { get; set; } = false; // Default to inactive, instructor activates it manually
  public bool HasBeenActivated { get; set; } = false; // Track if activity has ever been activated

  protected Activity()
  {
    Id = $"act.{Guid.NewGuid().ToString("N")[..12]}";
  }
}
