using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace InteractiveHub.Service;

public class PollSubmission : Submission
{
  public string Poll_SelectedOptionsJson { get; set; } = "[]";

  private List<int>? _selectedOptions;

  [NotMapped]
  public List<int> SelectedOptions
  {
    get => _selectedOptions ??= JsonSerializer.Deserialize<List<int>>(Poll_SelectedOptionsJson) ?? new();
    set
    {
      _selectedOptions = value;
      Poll_SelectedOptionsJson = JsonSerializer.Serialize(value);
    }
  }

  public PollSubmission()
  {
    Type = ActivityType.Polling;
    Id = $"psub.{Guid.NewGuid().ToString("N")[..12]}";
  }
}
