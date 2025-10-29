using System.ComponentModel.DataAnnotations.Schema;

namespace InteractiveHub.Service;

public class Discussion : Activity
{
  public int Discussion_MaxLength { get; set; } = 500;
  public bool Discussion_AllowAnonymous { get; set; } = false;
  public bool Discussion_RequireApproval { get; set; } = false;

  public Discussion()
  {
    Type = ActivityType.Discussion;
    Id = $"disc.{Guid.NewGuid().ToString("N")[..12]}";
  }
}
