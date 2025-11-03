using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace InteractiveHub.Service;

public class PollSubmission : Submission
{
  public string Poll_SelectedOptionsJson { get; set; } = "[]";

  private List<int>? _selectedOptions;

  [NotMapped]
  [JsonPropertyName("selectedOptions")]
  [JsonInclude]
  public List<int> SelectedOptions
  {
    get
    {
      // Always deserialize from JSON when getting
      if (string.IsNullOrEmpty(Poll_SelectedOptionsJson))
      {
        return new List<int>();
      }
      return JsonSerializer.Deserialize<List<int>>(Poll_SelectedOptionsJson) ?? new List<int>();
    }
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
