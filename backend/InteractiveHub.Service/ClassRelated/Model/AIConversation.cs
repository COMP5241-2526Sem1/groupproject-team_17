using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InteractiveHub.Service.ClassManagement;

/// <summary>
/// AI Conversation Session - Stores metadata for entire conversation
/// </summary>
[Table("AIConversations")]
public class AIConversation
{
  [Key]
  public string Id { get; set; } = Guid.NewGuid().ToString();

  /// <summary>
  /// Course ID
  /// </summary>
  public string CourseId { get; set; } = string.Empty;

  /// <summary>
  /// Instructor ID
  /// </summary>
  public string InstructorId { get; set; } = string.Empty;

  /// <summary>
  /// Activity type (quiz, poll, discussion)
  /// </summary>
  public string ActivityType { get; set; } = string.Empty;

  /// <summary>
  /// Conversation title
  /// </summary>
  public string Title { get; set; } = string.Empty;

  /// <summary>
  /// Whether generation is completed
  /// </summary>
  public bool IsCompleted { get; set; } = false;

  /// <summary>
  /// Generated activity ID (if created)
  /// </summary>
  public string? GeneratedActivityId { get; set; }

  /// <summary>
  /// Created timestamp
  /// </summary>
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

  /// <summary>
  /// Last updated timestamp
  /// </summary>
  public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

  /// <summary>
  /// List of conversation messages
  /// </summary>
  [NotMapped]
  public List<AIConversationMessage> Messages { get; set; } = new();

  /// <summary>
  /// List of activity previews generated in this conversation
  /// </summary>
  [NotMapped]
  public List<AIActivityPreview> ActivityPreviews { get; set; } = new();
}

/// <summary>
/// AI Activity Preview - Stores generated activity data before creation
/// </summary>
[Table("AIActivityPreviews")]
public class AIActivityPreview
{
  [Key]
  public string Id { get; set; } = Guid.NewGuid().ToString();

  /// <summary>
  /// Parent conversation ID
  /// </summary>
  public string ConversationId { get; set; } = string.Empty;

  /// <summary>
  /// Associated message ID (the assistant message that generated this preview)
  /// </summary>
  public string? MessageId { get; set; }

  /// <summary>
  /// Activity type (quiz, poll, discussion)
  /// </summary>
  public string ActivityType { get; set; } = string.Empty;

  /// <summary>
  /// Activity data in JSON format
  /// </summary>
  [Column(TypeName = "text")]
  public string ActivityDataJson { get; set; } = string.Empty;

  /// <summary>
  /// Whether this preview has been used to create an activity
  /// </summary>
  public bool IsCreated { get; set; } = false;

  /// <summary>
  /// Created activity ID (if IsCreated is true)
  /// </summary>
  public string? CreatedActivityId { get; set; }

  /// <summary>
  /// Preview order in conversation (for multiple previews)
  /// </summary>
  public int Order { get; set; }

  /// <summary>
  /// Created timestamp
  /// </summary>
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

  /// <summary>
  /// Related conversation
  /// </summary>
  [ForeignKey(nameof(ConversationId))]
  public AIConversation? Conversation { get; set; }
}

/// <summary>
/// AI Conversation Message - Stores individual conversation messages
/// </summary>
[Table("AIConversationMessages")]
public class AIConversationMessage
{
  [Key]
  public string Id { get; set; } = Guid.NewGuid().ToString();

  /// <summary>
  /// Parent conversation ID
  /// </summary>
  public string ConversationId { get; set; } = string.Empty;

  /// <summary>
  /// Message role (user, assistant, system)
  /// </summary>
  public string Role { get; set; } = string.Empty;

  /// <summary>
  /// Message content
  /// </summary>
  [Column(TypeName = "text")]
  public string Content { get; set; } = string.Empty;

  /// <summary>
  /// PDF content (if uploaded)
  /// </summary>
  [Column(TypeName = "text")]
  public string? PdfContent { get; set; }

  /// <summary>
  /// Message order in conversation
  /// </summary>
  public int Order { get; set; }

  /// <summary>
  /// Created timestamp
  /// </summary>
  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

  /// <summary>
  /// Related conversation
  /// </summary>
  [ForeignKey(nameof(ConversationId))]
  public AIConversation? Conversation { get; set; }
}

/// <summary>
/// PDF File Record
/// </summary>
[Table("AIPdfFiles")]
public class AIPdfFile
{
  [Key]
  public string Id { get; set; } = Guid.NewGuid().ToString();

  /// <summary>
  /// Conversation ID
  /// </summary>
  public string ConversationId { get; set; } = string.Empty;

  /// <summary>
  /// File name
  /// </summary>
  public string FileName { get; set; } = string.Empty;

  /// <summary>
  /// File size (bytes)
  /// </summary>
  public long FileSize { get; set; }

  /// <summary>
  /// Extracted text content
  /// </summary>
  [Column(TypeName = "text")]
  public string ExtractedText { get; set; } = string.Empty;

  /// <summary>
  /// Upload timestamp
  /// </summary>
  public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

  /// <summary>
  /// Related conversation
  /// </summary>
  [ForeignKey(nameof(ConversationId))]
  public AIConversation? Conversation { get; set; }
}
