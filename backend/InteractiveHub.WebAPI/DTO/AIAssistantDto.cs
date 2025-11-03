using System.Text.Json.Nodes;

namespace InteractiveHub.WebAPI.DTO;

/// <summary>
/// Request to create a new AI conversation
/// </summary>
public class CreateConversationRequest
{
  public string CourseId { get; set; } = string.Empty;
  public string ActivityType { get; set; } = string.Empty;
  public string Title { get; set; } = "New AI Conversation";
}

/// <summary>
/// Request to send a message in conversation
/// </summary>
public class SendMessageRequest
{
  public string ConversationId { get; set; } = string.Empty;
  public string Message { get; set; } = string.Empty;
  public string? PdfContent { get; set; }
}

/// <summary>
/// Response from AI with optional activity data
/// </summary>
public class AIMessageResponse
{
  public string Message { get; set; } = string.Empty;
  public JsonObject? ActivityData { get; set; }
  public bool HasActivityData { get; set; }
}

/// <summary>
/// Conversation summary DTO
/// </summary>
public class ConversationDto
{
  public string Id { get; set; } = string.Empty;
  public string CourseId { get; set; } = string.Empty;
  public string InstructorId { get; set; } = string.Empty;
  public string ActivityType { get; set; } = string.Empty;
  public string Title { get; set; } = string.Empty;
  public bool IsCompleted { get; set; }
  public string? GeneratedActivityId { get; set; }
  public DateTime CreatedAt { get; set; }
  public DateTime UpdatedAt { get; set; }
  public List<ConversationMessageDto> Messages { get; set; } = new();
  public List<ActivityPreviewDto> ActivityPreviews { get; set; } = new();
}

/// <summary>
/// Activity preview DTO
/// </summary>
public class ActivityPreviewDto
{
  public string Id { get; set; } = string.Empty;
  public string ConversationId { get; set; } = string.Empty;
  public string? MessageId { get; set; }
  public string ActivityType { get; set; } = string.Empty;
  public JsonObject? ActivityData { get; set; }
  public bool IsCreated { get; set; }
  public string? CreatedActivityId { get; set; }
  public int Order { get; set; }
  public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Individual message DTO
/// </summary>
public class ConversationMessageDto
{
  public string Id { get; set; } = string.Empty;
  public string Role { get; set; } = string.Empty;
  public string Content { get; set; } = string.Empty;
  public string? PdfContent { get; set; }
  public int Order { get; set; }
  public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Request to complete conversation with activity creation
/// </summary>
public class CompleteConversationRequest
{
  public string ConversationId { get; set; } = string.Empty;
  public string? PreviewId { get; set; }
  public JsonObject? ActivityData { get; set; }
}

/// <summary>
/// Request to upload PDF for extraction
/// </summary>
public class UploadPdfRequest
{
  public string ConversationId { get; set; } = string.Empty;
  public string FileName { get; set; } = string.Empty;
  public string Base64Content { get; set; } = string.Empty;
}
