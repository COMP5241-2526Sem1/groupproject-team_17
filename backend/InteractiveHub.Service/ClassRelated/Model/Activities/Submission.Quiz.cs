using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace InteractiveHub.Service;

public class QuizSubmission : Submission
{
  public string Quiz_AnswersJson { get; set; } = "[]";
  public double Quiz_Score { get; set; } = 0;
  public int Quiz_TimeSpent { get; set; } = 0; // seconds

  private List<int>? _answers;

  [NotMapped]
  public List<int> Answers
  {
    get => _answers ??= JsonSerializer.Deserialize<List<int>>(Quiz_AnswersJson) ?? new();
    set
    {
      _answers = value;
      Quiz_AnswersJson = JsonSerializer.Serialize(value);
    }
  }

  public QuizSubmission()
  {
    Type = ActivityType.Quiz;
    Id = $"qsub.{Guid.NewGuid().ToString("N")[..12]}";
  }
}
