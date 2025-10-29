




using System.Net.WebSockets;

public class JoinedStudent
{
  public string CourseId { get; set; } = string.Empty;
  public string StudentId { get; set; } = string.Empty;
  public string StudentName { get; set; } = string.Empty;

  public string Token { get; set; } = string.Empty;
  public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
  public WebSocket? webSocket { get; set; } = null!;
  public static JoinedStudent Create(string courseId, string studentId, string studentName)
  {
    return new JoinedStudent
    {
      CourseId = courseId,
      StudentId = studentId,
      StudentName = studentName,
      JoinedAt = DateTime.UtcNow
    };
  }

}
