namespace InteractiveHub.WebAPI.DTO;

public class LeaderboardStudentDto
{
  public string StudentId { get; set; } = string.Empty;
  public string StudentName { get; set; } = string.Empty;
  public string Email { get; set; } = string.Empty;
  public int CompletedActivities { get; set; }
  public int TotalActivities { get; set; }
  public double CompletionRate { get; set; }
  public int TotalQuizScore { get; set; }
  public int MaxQuizScore { get; set; }
  public double QuizScorePercentage { get; set; }
  public int Rank { get; set; }
}

public class LeaderboardResponseDto
{
  public int TotalActivities { get; set; }
  public List<LeaderboardStudentDto> Students { get; set; } = new();
}
