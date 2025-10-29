using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace InteractiveHub.Service;

public class Quiz : Activity
{
  public string Quiz_QuestionsJson { get; set; } = "[]";
  public int Quiz_TimeLimit { get; set; } = 300; // seconds
  public bool Quiz_ShowCorrectAnswers { get; set; } = false;
  public bool Quiz_ShuffleQuestions { get; set; } = false;

  private List<QuizQuestion>? _questions;

  [NotMapped]
  public List<QuizQuestion> Questions
  {
    get => _questions ??= JsonSerializer.Deserialize<List<QuizQuestion>>(Quiz_QuestionsJson) ?? new();
    set
    {
      _questions = value;
      Quiz_QuestionsJson = JsonSerializer.Serialize(value);
    }
  }

  public Quiz()
  {
    Type = ActivityType.Quiz;
    Id = $"quiz.{Guid.NewGuid().ToString("N")[..12]}";
  }
}

public class QuizQuestion
{
  public string Text { get; set; } = string.Empty;
  public List<string> Options { get; set; } = new();
  public int CorrectAnswer { get; set; } // Index of correct option
  public int Points { get; set; } = 1;
  public string? Explanation { get; set; }
}
