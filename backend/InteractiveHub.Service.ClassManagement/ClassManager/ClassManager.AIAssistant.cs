using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace InteractiveHub.Service.ClassManagement;

public partial class ClassManager
{
  // ============================================
  // AI Assistant - Create Conversation
  // ============================================

  /// <summary>
  /// Create a new AI conversation session
  /// </summary>
  public async Task<(ResCode, AIConversation?)> CreateConversationAsync(
      string courseId,
      string instructorId,
      string activityType,
      string title = "New AI Conversation")
  {
    try
    {
      // Verify course exists
      var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
      if (course == null)
      {
        return (ResCode.CourseNotFound, null);
      }

      // Validate activity type
      if (activityType != "quiz" && activityType != "poll" && activityType != "discussion")
      {
        return (ResCode.InvalidActivityType, null);
      }

      var conversation = new AIConversation
      {
        Id = Guid.NewGuid().ToString(),
        CourseId = courseId,
        InstructorId = instructorId,
        ActivityType = activityType,
        Title = title,
        IsCompleted = false,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
      };

      await db.AIConversations.AddAsync(conversation);
      await db.SaveChangesAsync();

      _log?.LogInfo($"AI Conversation {conversation.Id} created for course {courseId}");
      return (ResCode.OK, conversation);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error creating AI conversation: {ex.Message}");
      return (ResCode.DatabaseError, null);
    }
  }

  // ============================================
  // AI Assistant - Add Message
  // ============================================

  /// <summary>
  /// Add a message to an existing conversation
  /// </summary>
  public async Task<(ResCode, AIConversationMessage?)> AddMessageAsync(
      string conversationId,
      string role,
      string content,
      string? pdfContent = null)
  {
    try
    {
      // Verify conversation exists
      var conversation = await db.AIConversations
          .FirstOrDefaultAsync(c => c.Id == conversationId);

      if (conversation == null)
      {
        return (ResCode.ActivityNotFound, null);
      }

      // Get current message count for ordering
      var messageCount = await db.AIConversationMessages
          .Where(m => m.ConversationId == conversationId)
          .CountAsync();

      var message = new AIConversationMessage
      {
        Id = Guid.NewGuid().ToString(),
        ConversationId = conversationId,
        Role = role,
        Content = content,
        PdfContent = pdfContent,
        Order = messageCount,
        CreatedAt = DateTime.UtcNow
      };

      await db.AIConversationMessages.AddAsync(message);

      // Update conversation timestamp
      conversation.UpdatedAt = DateTime.UtcNow;
      db.AIConversations.Update(conversation);

      await db.SaveChangesAsync();

      _log?.LogInfo($"Message added to conversation {conversationId}");
      return (ResCode.OK, message);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error adding message to conversation: {ex.Message}");
      return (ResCode.DatabaseError, null);
    }
  }

  // ============================================
  // AI Assistant - Get Conversation
  // ============================================

  /// <summary>
  /// Get a conversation with all its messages
  /// </summary>
  public async Task<(ResCode, AIConversation?)> GetConversationAsync(string conversationId)
  {
    try
    {
      var conversation = await db.AIConversations
          .FirstOrDefaultAsync(c => c.Id == conversationId);

      if (conversation == null)
      {
        return (ResCode.ActivityNotFound, null);
      }

      // Load messages separately and assign to the collection
      var messages = await db.AIConversationMessages
          .Where(m => m.ConversationId == conversationId)
          .OrderBy(m => m.Order)
          .ToListAsync();

      conversation.Messages = messages;

      // Load activity previews
      var previews = await db.AIActivityPreviews
          .Where(p => p.ConversationId == conversationId)
          .OrderBy(p => p.Order)
          .ToListAsync();

      conversation.ActivityPreviews = previews;

      _log?.LogInfo($"Retrieved conversation {conversationId} with {messages.Count} messages and {previews.Count} previews");

      return (ResCode.OK, conversation);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error retrieving conversation: {ex.Message}");
      return (ResCode.DatabaseError, null);
    }
  }

  // ============================================
  // AI Assistant - List Conversations
  // ============================================

  /// <summary>
  /// Get all conversations for an instructor, optionally filtered by course
  /// </summary>
  public async Task<(ResCode, List<AIConversation>)> GetInstructorConversationsAsync(
      string instructorId,
      string? courseId = null,
      bool includeCompleted = true)
  {
    try
    {
      var query = db.AIConversations
          .Where(c => c.InstructorId == instructorId);

      if (courseId != null)
      {
        query = query.Where(c => c.CourseId == courseId);
      }

      if (!includeCompleted)
      {
        query = query.Where(c => !c.IsCompleted);
      }

      var conversations = await query
          .OrderByDescending(c => c.UpdatedAt)
          .ToListAsync();

      return (ResCode.OK, conversations);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error retrieving instructor conversations: {ex.Message}");
      return (ResCode.DatabaseError, new List<AIConversation>());
    }
  }

  // ============================================
  // AI Assistant - Generate Activity with AI
  // ============================================

  /// <summary>
  /// Call LLM API to generate activity response with function calling support
  /// Supports both GitHub Models and DeepSeek
  /// </summary>
  public async Task<(ResCode, string, JsonObject?)> GenerateActivityWithAIAsync(
      string conversationId,
      string userPrompt,
      string? pdfContent = null,
      string? apiKey = null,
      HttpClient? httpClient = null,
      string? provider = null,
      string? model = null)
  {
    try
    {
      // Get conversation with all messages
      var (getCode, conversation) = await GetConversationAsync(conversationId);
      if (getCode != ResCode.OK || conversation == null)
      {
        return (ResCode.ActivityNotFound, "Conversation not found", null);
      }

      if (httpClient == null)
      {
        return (ResCode.InvalidCourseData, "HttpClient is required", null);
      }

      if (string.IsNullOrEmpty(apiKey))
      {
        return (ResCode.InvalidCourseData, "API key is required", null);
      }

      // Determine provider and endpoint
      string apiEndpoint;
      string apiModel;

      if (provider?.ToLower() == "deepseek")
      {
        apiEndpoint = "https://api.deepseek.com/v1/chat/completions";
        apiModel = model ?? "deepseek-chat";
      }
      else
      {
        // Default to GitHub Models
        apiEndpoint = "https://models.inference.ai.azure.com/chat/completions";
        apiModel = model ?? "gpt-4o";
      }

      // Build conversation history for LLM
      var messages = new List<object>();

      // Add system prompt based on activity type
      messages.Add(new
      {
        role = "system",
        content = GetSystemPromptForFunctionCall(conversation.ActivityType)
      });

      // Add previous messages from conversation history
      foreach (var msg in conversation.Messages)
      {
        messages.Add(new
        {
          role = msg.Role,
          content = msg.Content + (msg.PdfContent != null ? $"\n\nPDF Content:\n{msg.PdfContent}" : "")
        });
      }

      // Add current user prompt
      var currentContent = userPrompt;
      if (!string.IsNullOrEmpty(pdfContent))
      {
        currentContent += $"\n\nPDF Content:\n{pdfContent}";
      }

      // Validate content is not empty
      if (string.IsNullOrWhiteSpace(currentContent))
      {
        return (ResCode.InvalidCourseData, "Message content cannot be empty", null);
      }

      messages.Add(new
      {
        role = "user",
        content = currentContent
      });

      // Get function definitions based on activity type
      var tools = GetFunctionDefinitions(conversation.ActivityType);

      // Prepare GitHub LLM API request with function calling
      var requestBody = new
      {
        messages,
        model = apiModel,
        temperature = 0.7,
        max_tokens = 4000,
        tools = tools,
        tool_choice = "auto"
      };

      var jsonContent = JsonSerializer.Serialize(requestBody);
      var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

      httpClient.DefaultRequestHeaders.Clear();
      httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

      var response = await httpClient.PostAsync(
          apiEndpoint,
          content
      );

      if (!response.IsSuccessStatusCode)
      {
        var errorContent = await response.Content.ReadAsStringAsync();
        _log?.LogError($"GitHub LLM API error: {response.StatusCode} - {errorContent}");
        _log?.LogError($"Request body was: {jsonContent}");
        return (ResCode.InternalError, $"LLM API error: {response.StatusCode} - {errorContent}", null);
      }

      var responseContent = await response.Content.ReadAsStringAsync();
      var jsonResponse = JsonSerializer.Deserialize<JsonObject>(responseContent);

      // Safely access choices array
      var choices = jsonResponse?["choices"]?.AsArray();
      if (choices == null || choices.Count == 0)
      {
        _log?.LogError("API response has no choices array");
        return (ResCode.InternalError, "Invalid API response: no choices", null);
      }

      var choice = choices[0];
      var message = choice?["message"];
      var toolCalls = message?["tool_calls"]?.AsArray();

      JsonObject? activityData = null;
      string assistantMessage = "";

      // Check if LLM wants to call a function
      if (toolCalls != null && toolCalls.Count > 0)
      {
        var toolCall = toolCalls[0];
        var functionName = toolCall?["function"]?["name"]?.GetValue<string>() ?? "";
        var functionArgs = toolCall?["function"]?["arguments"]?.GetValue<string>() ?? "";

        _log?.LogInfo($"LLM called function: {functionName}");

        // Parse the function arguments as activity data
        if (!string.IsNullOrEmpty(functionArgs))
        {
          activityData = JsonSerializer.Deserialize<JsonObject>(functionArgs);
          assistantMessage = $"I've prepared a {conversation.ActivityType} activity for you. You can preview and modify it before creating.";
        }
        else
        {
          assistantMessage = "I need more information to create the activity. Could you provide more details?";
        }
      }
      else
      {
        // No function call, just regular conversation
        assistantMessage = message?["content"]?.GetValue<string>() ?? "";

        if (string.IsNullOrEmpty(assistantMessage))
        {
          return (ResCode.InternalError, "Empty response from LLM", null);
        }
      }

      // Save user message
      await AddMessageAsync(conversationId, "user", userPrompt, pdfContent);

      // Save assistant response
      await AddMessageAsync(conversationId, "assistant", assistantMessage);

      _log?.LogInfo($"AI response generated for conversation {conversationId}");
      return (ResCode.OK, assistantMessage, activityData);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error generating AI response: {ex.Message}");
      return (ResCode.InternalError, $"Error: {ex.Message}", null);
    }
  }

  // ============================================
  // AI Assistant - Complete Conversation
  // ============================================

  /// <summary>
  /// Mark conversation as completed and link generated activity
  /// </summary>
  public async Task<(ResCode, AIConversation?)> CompleteConversationAsync(
      string conversationId,
      string? generatedActivityId = null)
  {
    try
    {
      var conversation = await db.AIConversations
          .FirstOrDefaultAsync(c => c.Id == conversationId);

      if (conversation == null)
      {
        return (ResCode.ActivityNotFound, null);
      }

      conversation.IsCompleted = true;
      conversation.GeneratedActivityId = generatedActivityId;
      conversation.UpdatedAt = DateTime.UtcNow;

      db.AIConversations.Update(conversation);
      await db.SaveChangesAsync();

      _log?.LogInfo($"Conversation {conversationId} marked as completed");
      return (ResCode.OK, conversation);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error completing conversation: {ex.Message}");
      return (ResCode.DatabaseError, null);
    }
  }

  // ============================================
  // AI Assistant - Upload PDF
  // ============================================

  /// <summary>
  /// Save PDF file record and extract text
  /// </summary>
  public async Task<(ResCode, AIPdfFile?)> UploadPdfFileAsync(
      string conversationId,
      string fileName,
      long fileSize,
      string extractedText)
  {
    try
    {
      // Verify conversation exists
      var conversation = await db.AIConversations
          .FirstOrDefaultAsync(c => c.Id == conversationId);

      if (conversation == null)
      {
        return (ResCode.ActivityNotFound, null);
      }

      var pdfFile = new AIPdfFile
      {
        Id = Guid.NewGuid().ToString(),
        ConversationId = conversationId,
        FileName = fileName,
        FileSize = fileSize,
        ExtractedText = extractedText,
        UploadedAt = DateTime.UtcNow
      };

      await db.AIPdfFiles.AddAsync(pdfFile);
      await db.SaveChangesAsync();

      _log?.LogInfo($"PDF file {fileName} uploaded for conversation {conversationId}");
      return (ResCode.OK, pdfFile);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error uploading PDF file: {ex.Message}");
      return (ResCode.DatabaseError, null);
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /// <summary>
  /// Get system prompt for function calling approach
  /// </summary>
  private string GetSystemPromptForFunctionCall(string activityType)
  {
    return @"You are a versatile AI assistant helping instructors create various educational activities including quizzes, polls, and discussions.

Your role is to:
1. Understand the instructor's needs and the type of activity they want to create
2. Analyze any provided materials (text, PDFs, lecture notes, topics)
3. Generate appropriate content based on the activity type requested
4. Call the relevant function (create_quiz_activity, create_poll_activity, or create_discussion_activity) when ready
5. Provide helpful suggestions and engage in conversation to refine the activity

Guidelines:
- For quizzes: Create questions that test understanding, not just memorization. Provide clear explanations.
- For polls: Generate options that cover different perspectives and are clear to students.
- For discussions: Create thought-provoking prompts that encourage critical thinking and diverse perspectives.
- Always be responsive to the instructor's specific requirements and context.
- If the instructor hasn't specified an activity type, help them determine the best type for their needs.";
  }

  /// <summary>
  /// Get function definitions for LLM function calling - returns all activity types for versatile assistant
  /// </summary>
  private object[] GetFunctionDefinitions(string activityType)
  {
    // Return all function definitions regardless of activity type
    // This makes the AI assistant versatile and able to create any type of activity
    return new object[]
    {
      // Quiz Activity
      new
      {
        type = "function",
        function = new
        {
          name = "create_quiz_activity",
          description = "Create a quiz activity with multiple choice questions",
          parameters = new
          {
            type = "object",
            required = new[] { "title", "questions" },
            properties = new Dictionary<string, object>
            {
              ["title"] = new { type = "string", description = "The title of the quiz" },
              ["description"] = new { type = "string", description = "A brief description of the quiz" },
              ["timeLimit"] = new { type = "integer", description = "Time limit in seconds (default: 300)" },
              ["showCorrectAnswers"] = new { type = "boolean", description = "Whether to show correct answers after submission" },
              ["shuffleQuestions"] = new { type = "boolean", description = "Whether to randomize question order" },
              ["questions"] = new
              {
                type = "array",
                description = "Array of quiz questions",
                items = new
                {
                  type = "object",
                  required = new[] { "text", "options", "correctAnswer" },
                  properties = new Dictionary<string, object>
                  {
                    ["text"] = new { type = "string", description = "The question text" },
                    ["options"] = new
                    {
                      type = "array",
                      description = "Array of answer options",
                      items = new { type = "string" }
                    },
                    ["correctAnswer"] = new { type = "integer", description = "Index of the correct answer (0-based)" },
                    ["points"] = new { type = "integer", description = "Points awarded for correct answer" },
                    ["explanation"] = new { type = "string", description = "Explanation for the correct answer" }
                  }
                }
              }
            }
          }
        }
      },
      // Poll Activity
      new
      {
        type = "function",
        function = new
        {
          name = "create_poll_activity",
          description = "Create a poll activity for gathering student opinions",
          parameters = new
          {
            type = "object",
            required = new[] { "title", "options" },
            properties = new Dictionary<string, object>
            {
              ["title"] = new { type = "string", description = "The title of the poll" },
              ["description"] = new { type = "string", description = "A brief description of the poll question" },
              ["allowMultipleSelections"] = new { type = "boolean", description = "Whether students can select multiple options" },
              ["isAnonymous"] = new { type = "boolean", description = "Whether responses are anonymous" },
              ["options"] = new
              {
                type = "array",
                description = "Array of poll options",
                items = new
                {
                  type = "object",
                  required = new[] { "text" },
                  properties = new Dictionary<string, object>
                  {
                    ["text"] = new { type = "string", description = "The option text" },
                    ["imageUrl"] = new { type = "string", description = "Optional image URL for the option" }
                  }
                }
              }
            }
          }
        }
      },
      // Discussion Activity
      new
      {
        type = "function",
        function = new
        {
          name = "create_discussion_activity",
          description = "Create a discussion activity for student engagement",
          parameters = new
          {
            type = "object",
            required = new[] { "title", "description" },
            properties = new Dictionary<string, object>
            {
              ["title"] = new { type = "string", description = "The title of the discussion" },
              ["description"] = new { type = "string", description = "The discussion prompt and guidelines" },
              ["maxLength"] = new { type = "integer", description = "Maximum length of student responses in characters" },
              ["allowAnonymous"] = new { type = "boolean", description = "Whether students can post anonymously" },
              ["requireApproval"] = new { type = "boolean", description = "Whether posts require instructor approval before being visible" }
            }
          }
        }
      }
    };
  }

  /// <summary>
  /// Get system prompt based on activity type (legacy, kept for compatibility)
  /// </summary>
  private string GetSystemPrompt(string activityType)
  {
    return activityType.ToLower() switch
    {
      "quiz" => @"You are an AI assistant helping instructors create educational quiz activities.
Your role is to:
1. Analyze provided materials (text, PDFs, lecture notes)
2. Generate relevant quiz questions with multiple choice answers
3. Ensure questions test understanding, not just memorization
4. Provide clear explanations for correct answers
5. Format output as JSON with this structure:
{
  ""title"": ""Quiz Title"",
  ""description"": ""Brief description"",
  ""timeLimit"": 300,
  ""showCorrectAnswers"": true,
  ""shuffleQuestions"": false,
  ""questions"": [
    {
      ""text"": ""Question text"",
      ""options"": [""Option 1"", ""Option 2"", ""Option 3"", ""Option 4""],
      ""correctAnswer"": 0,
      ""points"": 1,
      ""explanation"": ""Why this answer is correct""
    }
  ]
}",

      "poll" => @"You are an AI assistant helping instructors create poll activities.
Your role is to:
1. Analyze the topic and create engaging poll questions
2. Generate relevant options that cover different perspectives
3. Ensure options are clear and mutually exclusive (unless multiple selection)
4. Format output as JSON with this structure:
{
  ""title"": ""Poll Title"",
  ""description"": ""Brief description"",
  ""allowMultipleSelections"": false,
  ""isAnonymous"": true,
  ""options"": [
    {
      ""text"": ""Option 1"",
      ""imageUrl"": null
    },
    {
      ""text"": ""Option 2"",
      ""imageUrl"": null
    }
  ]
}",

      "discussion" => @"You are an AI assistant helping instructors create discussion activities.
Your role is to:
1. Analyze the topic and create thought-provoking discussion prompts
2. Encourage critical thinking and diverse perspectives
3. Provide clear guidelines for participation
4. Format output as JSON with this structure:
{
  ""title"": ""Discussion Title"",
  ""description"": ""Discussion prompt and guidelines"",
  ""maxLength"": 500,
  ""allowAnonymous"": false,
  ""requireApproval"": false
}",

      _ => "You are an AI assistant helping instructors create educational activities."
    };
  }

  // ============================================
  // AI Assistant - Delete Conversation
  // ============================================

  /// <summary>
  /// Delete a conversation and all its messages
  /// </summary>
  public async Task<ResCode> DeleteConversationAsync(string conversationId)
  {
    try
    {
      var conversation = await db.AIConversations
          .FirstOrDefaultAsync(c => c.Id == conversationId);

      if (conversation == null)
      {
        return ResCode.ActivityNotFound;
      }

      // Delete all related messages
      var messages = await db.AIConversationMessages
          .Where(m => m.ConversationId == conversationId)
          .ToListAsync();

      db.AIConversationMessages.RemoveRange(messages);

      // Delete all related activity previews
      var previews = await db.AIActivityPreviews
          .Where(p => p.ConversationId == conversationId)
          .ToListAsync();

      db.AIActivityPreviews.RemoveRange(previews);

      // Delete the conversation
      db.AIConversations.Remove(conversation);

      await db.SaveChangesAsync();

      _log?.LogInfo($"Deleted conversation {conversationId} with {messages.Count} messages and {previews.Count} previews");
      return ResCode.OK;
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error deleting conversation: {ex.Message}");
      return ResCode.DatabaseError;
    }
  }

  // ============================================
  // AI Assistant - Activity Preview Management
  // ============================================

  /// <summary>
  /// Save an activity preview generated by AI
  /// </summary>
  public async Task<(ResCode, AIActivityPreview?)> SaveActivityPreviewAsync(
      string conversationId,
      string activityType,
      string activityDataJson,
      string? messageId = null)
  {
    try
    {
      // Verify conversation exists
      var conversation = await db.AIConversations
          .FirstOrDefaultAsync(c => c.Id == conversationId);

      if (conversation == null)
      {
        return (ResCode.ActivityNotFound, null);
      }

      // Get current preview count for ordering
      var previewCount = await db.AIActivityPreviews
          .Where(p => p.ConversationId == conversationId)
          .CountAsync();

      var preview = new AIActivityPreview
      {
        Id = Guid.NewGuid().ToString(),
        ConversationId = conversationId,
        MessageId = messageId,
        ActivityType = activityType,
        ActivityDataJson = activityDataJson,
        IsCreated = false,
        Order = previewCount,
        CreatedAt = DateTime.UtcNow
      };

      await db.AIActivityPreviews.AddAsync(preview);
      await db.SaveChangesAsync();

      _log?.LogInfo($"Saved activity preview {preview.Id} for conversation {conversationId} linked to message {messageId}");
      return (ResCode.OK, preview);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error saving activity preview: {ex.Message}");
      return (ResCode.DatabaseError, null);
    }
  }

  /// <summary>
  /// Mark a preview as created and link it to the created activity
  /// </summary>
  public async Task<ResCode> MarkPreviewAsCreatedAsync(string previewId, string createdActivityId)
  {
    try
    {
      var preview = await db.AIActivityPreviews
          .FirstOrDefaultAsync(p => p.Id == previewId);

      if (preview == null)
      {
        return ResCode.ActivityNotFound;
      }

      preview.IsCreated = true;
      preview.CreatedActivityId = createdActivityId;

      db.AIActivityPreviews.Update(preview);
      await db.SaveChangesAsync();

      _log?.LogInfo($"Marked preview {previewId} as created with activity {createdActivityId}");
      return ResCode.OK;
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error marking preview as created: {ex.Message}");
      return ResCode.DatabaseError;
    }
  }

  /// <summary>
  /// Get all activity previews for a conversation
  /// </summary>
  public async Task<(ResCode, List<AIActivityPreview>)> GetConversationPreviewsAsync(string conversationId)
  {
    try
    {
      var previews = await db.AIActivityPreviews
          .Where(p => p.ConversationId == conversationId)
          .OrderBy(p => p.Order)
          .ToListAsync();

      return (ResCode.OK, previews);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error retrieving activity previews: {ex.Message}");
      return (ResCode.DatabaseError, new List<AIActivityPreview>());
    }
  }
}
