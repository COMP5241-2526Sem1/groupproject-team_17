namespace InteractiveHub.Service;

public class DiscussionSubmission : Submission
{
  public string Discussion_Text { get; set; } = string.Empty;
  public bool Discussion_IsApproved { get; set; } = true;
  public bool Discussion_IsAnonymous { get; set; } = false;

  public DiscussionSubmission()
  {
    Type = ActivityType.Discussion;
    Id = $"dsub.{Guid.NewGuid().ToString("N")[..12]}";
  }
}
