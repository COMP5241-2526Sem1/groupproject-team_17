namespace InteractiveHub.WebAPI.DTO;

public class PollSubmissionDto
{
  public string Id { get; set; } = string.Empty;
  public string CourseId { get; set; } = string.Empty;
  public string StudentId { get; set; } = string.Empty;
  public string ActivityId { get; set; } = string.Empty;
  public DateTime SubmittedAt { get; set; }
  public int Type { get; set; }
  public List<int> SelectedOptions { get; set; } = new();
}
