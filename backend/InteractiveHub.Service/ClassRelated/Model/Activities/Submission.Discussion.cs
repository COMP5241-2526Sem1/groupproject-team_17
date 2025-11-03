using System.Text.Json.Serialization;

namespace InteractiveHub.Service;

public class DiscussionSubmission : Submission
{
  [JsonPropertyName("text")]
  public string Discussion_Text { get; set; } = string.Empty;

  [JsonPropertyName("isApproved")]
  public bool Discussion_IsApproved { get; set; } = true;

  [JsonPropertyName("isAnonymous")]
  public bool Discussion_IsAnonymous { get; set; } = false;

  public DiscussionSubmission()
  {
    Type = ActivityType.Discussion;
    Id = $"dsub.{Guid.NewGuid().ToString("N")[..12]}";
  }
}
