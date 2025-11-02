using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace InteractiveHub.Service;

public class QuizSubmission : Submission
{
  public string Quiz_AnswersJson { get; set; } = "[]";

  [JsonPropertyName("score")]
  public double Quiz_Score { get; set; } = 0;

  [JsonPropertyName("timeSpent")]
  public int Quiz_TimeSpent { get; set; } = 0; // seconds

  private List<int>? _answers;

  [NotMapped]
  [JsonPropertyName("answers")]
  [JsonInclude]
  public List<int> Answers
  {
    get
    {
      // Always deserialize from JSON when getting
      if (string.IsNullOrEmpty(Quiz_AnswersJson))
      {
        return new List<int>();
      }
      return JsonSerializer.Deserialize<List<int>>(Quiz_AnswersJson) ?? new List<int>();
    }
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
