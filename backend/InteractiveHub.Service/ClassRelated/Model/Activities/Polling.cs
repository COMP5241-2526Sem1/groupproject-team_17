using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace InteractiveHub.Service;

public class Poll : Activity
{
  public string Poll_OptionsJson { get; set; } = "[]";
  public bool Poll_AllowMultipleSelections { get; set; } = false;
  public bool Poll_IsAnonymous { get; set; } = true;

  private List<PollOption>? _options;

  [NotMapped]
  public List<PollOption> Options
  {
    get => _options ??= JsonSerializer.Deserialize<List<PollOption>>(Poll_OptionsJson) ?? new();
    set
    {
      _options = value;
      Poll_OptionsJson = JsonSerializer.Serialize(value);
    }
  }

  public Poll()
  {
    Type = ActivityType.Polling;
    Id = $"poll.{Guid.NewGuid().ToString("N")[..12]}";
  }
}

public class PollOption
{
  public string Text { get; set; } = string.Empty;
  public string? ImageUrl { get; set; }
}
