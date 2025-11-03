using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using InteractiveHub.Service;
using InteractiveHub.Service.ClassManagement;
using InteractiveHub.WebAPI.DTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InteractiveHub.WebAPI.Controllers;

[Authorize]
[Route("api/AIAssistant")]
[ApiController]
public class AIAssistantController : IHControllerBase
{
  private readonly IClassManager _classManager;
  private readonly IConfiguration _configuration;
  private readonly IHttpClientFactory _httpClientFactory;

  public AIAssistantController(
      IClassManager classManager,
      IConfiguration configuration,
      IHttpClientFactory httpClientFactory,
      IHubLogger logger) : base(logger)
  {
    _classManager = classManager;
    _configuration = configuration;
    _httpClientFactory = httpClientFactory;
  }

  /// <summary>
  /// Create a new AI conversation session
  /// </summary>
  [HttpPost("CreateConversation")]
  [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult<ConversationDto>))]
  [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
  public async Task<IActionResult> CreateConversation([FromBody] CreateConversationRequest request)
  {
    return await HandleWithResultAsync(async () =>
    {
      var instructorId = User.FindFirst("sub")?.Value ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
      if (string.IsNullOrEmpty(instructorId))
      {
        return ReturnResponse(new ServiceRes(ResCode.Unauthorized, "User not authenticated"));
      }

      var (code, conversation) = await _classManager.CreateConversationAsync(
              request.CourseId,
              instructorId,
              request.ActivityType,
              request.Title
          );

      if (code != ResCode.OK || conversation == null)
      {
        return ReturnResponse(new ServiceRes(code, "Failed to create conversation"));
      }

      var dto = ConversationToDto(conversation);
      return ReturnOK(dto, "Conversation created successfully");
    });
  }

  /// <summary>
  /// Send a message and get AI response
  /// </summary>
  [HttpPost("SendMessage")]
  [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult<AIMessageResponse>))]
  [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
  public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
  {
    return await HandleWithResultAsync(async () =>
    {
      // Get LLM provider configuration
      var provider = _configuration["LLM:Provider"] ?? "GitHub";
      string? apiKey;
      string? model;

      if (provider.Equals("DeepSeek", StringComparison.OrdinalIgnoreCase))
      {
        apiKey = _configuration["DeepSeek:ApiKey"];
        model = _configuration["DeepSeek:Model"] ?? "deepseek-chat";

        if (string.IsNullOrEmpty(apiKey))
        {
          return ReturnResponse(new ServiceRes(ResCode.InternalError, "DeepSeek API key not configured"));
        }
      }
      else
      {
        apiKey = _configuration["GitHub:Token"];
        model = "gpt-4o";

        if (string.IsNullOrEmpty(apiKey))
        {
          return ReturnResponse(new ServiceRes(ResCode.InternalError, "GitHub token not configured"));
        }
      }

      var httpClient = _httpClientFactory.CreateClient();

      var (code, message, activityData) = await _classManager.GenerateActivityWithAIAsync(
              request.ConversationId,
              request.Message,
              request.PdfContent,
              apiKey,
              httpClient,
              provider,
              model
          );

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes(code, message));
      }

      var response = new AIMessageResponse
      {
        Message = message,
        ActivityData = activityData,
        HasActivityData = activityData != null
      };

      return ReturnOK(response, "Message sent successfully");
    });
  }

  /// <summary>
  /// Send a message and get AI response with streaming (Server-Sent Events)
  /// </summary>
  [HttpPost("SendMessageStream")]
  public async Task SendMessageStream([FromBody] SendMessageRequest request)
  {
    Response.Headers.Append("Content-Type", "text/event-stream");
    Response.Headers.Append("Cache-Control", "no-cache");
    Response.Headers.Append("Connection", "keep-alive");
    Response.Headers.Append("X-Accel-Buffering", "no"); // Disable nginx buffering

    // CRITICAL: Disable response buffering to enable true streaming
    var bufferingFeature = HttpContext.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpResponseBodyFeature>();
    if (bufferingFeature != null)
    {
      bufferingFeature.DisableBuffering();
    }

    try
    {
      // Get LLM provider configuration
      var provider = _configuration["LLM:Provider"] ?? "GitHub";
      string? apiKey;
      string? model;

      if (provider.Equals("DeepSeek", StringComparison.OrdinalIgnoreCase))
      {
        apiKey = _configuration["DeepSeek:ApiKey"];
        model = _configuration["DeepSeek:Model"] ?? "deepseek-chat";

        if (string.IsNullOrEmpty(apiKey))
        {
          await WriteSSEError("DeepSeek API key not configured");
          return;
        }
      }
      else
      {
        apiKey = _configuration["GitHub:Token"];
        model = "gpt-4o";

        if (string.IsNullOrEmpty(apiKey))
        {
          await WriteSSEError("GitHub token not configured");
          return;
        }
      }

      var httpClient = _httpClientFactory.CreateClient();

      // Get conversation with all messages
      var (getCode, conversation) = await _classManager.GetConversationAsync(request.ConversationId);
      if (getCode != ResCode.OK || conversation == null)
      {
        await WriteSSEError("Conversation not found");
        return;
      }

      // Build conversation history for LLM
      var messages = new List<object>
            {
                new
                {
                    role = "system",
                    content = GetSystemPrompt(conversation.ActivityType)
                }
            };

      // Add previous messages
      foreach (var msg in conversation.Messages)
      {
        messages.Add(new
        {
          role = msg.Role,
          content = msg.Content + (msg.PdfContent != null ? $"\n\nPDF Content:\n{msg.PdfContent}" : "")
        });
      }

      // Add current user prompt
      var currentContent = request.Message;
      if (!string.IsNullOrEmpty(request.PdfContent))
      {
        currentContent += $"\n\nPDF Content:\n{request.PdfContent}";
      }

      // Validate content is not empty
      if (string.IsNullOrWhiteSpace(currentContent))
      {
        await WriteSSEError("Message content cannot be empty");
        return;
      }

      messages.Add(new
      {
        role = "user",
        content = currentContent
      });

      // Get function definitions
      var tools = GetFunctionDefinitions(conversation.ActivityType);

      // Determine API endpoint based on provider
      string apiEndpoint;
      if (provider.Equals("DeepSeek", StringComparison.OrdinalIgnoreCase))
      {
        apiEndpoint = "https://api.deepseek.com/v1/chat/completions";
      }
      else
      {
        apiEndpoint = "https://models.inference.ai.azure.com/chat/completions";
      }

      // Prepare streaming request
      var requestBody = new
      {
        messages = messages,
        model = model,
        temperature = 0.7,
        max_tokens = 4000,
        tools = tools,
        tool_choice = "auto",
        stream = true
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
        var errorMsg = $"LLM API error: {response.StatusCode} - {errorContent}";

        // Save messages before returning
        await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
        await _classManager.AddMessageAsync(request.ConversationId, "assistant", errorMsg);

        await WriteSSEError(errorMsg);
        await WriteSSEData(new { type = "complete", message = errorMsg });
        return;
      }

      // Stream the response
      var stream = await response.Content.ReadAsStreamAsync();
      using var reader = new StreamReader(stream);

      var fullMessage = new StringBuilder();
      var functionName = "";
      var functionArgs = new StringBuilder();
      var inFunctionCall = false;

      while (!reader.EndOfStream)
      {
        var line = await reader.ReadLineAsync();
        if (string.IsNullOrEmpty(line) || !line.StartsWith("data: ")) continue;

        var data = line.Substring(6);
        if (data == "[DONE]")
        {
          break;
        }

        try
        {
          var chunk = JsonSerializer.Deserialize<JsonObject>(data);

          // Safely check for choices array
          var choices = chunk?["choices"]?.AsArray();
          if (choices == null || choices.Count == 0)
          {
            continue; // Skip chunks without choices
          }

          var delta = choices[0]?["delta"];

          if (delta != null)
          {
            // Check for function call
            var toolCalls = delta["tool_calls"]?.AsArray();
            if (toolCalls != null && toolCalls.Count > 0)
            {
              var functionData = toolCalls[0]?["function"];

              var nameDelta = functionData?["name"]?.GetValue<string>();
              if (!string.IsNullOrEmpty(nameDelta))
              {
                // First time we see the function name - send status immediately
                if (!inFunctionCall)
                {
                  inFunctionCall = true;

                  // Send early status based on partial function name
                  var partialName = nameDelta;
                  string statusMsg = "Processing...";

                  if (partialName.Contains("search"))
                  {
                    statusMsg = "Searching for activities...";
                  }
                  else if (partialName.Contains("quiz"))
                  {
                    statusMsg = "Creating Quiz for you...";
                  }
                  else if (partialName.Contains("poll"))
                  {
                    statusMsg = "Creating Poll for you...";
                  }
                  else if (partialName.Contains("discussion"))
                  {
                    statusMsg = "Creating Discussion for you...";
                  }
                  else if (partialName.Contains("submission"))
                  {
                    statusMsg = "Retrieving student submissions...";
                  }

                  await WriteSSEData(new { type = "status", message = statusMsg });
                }

                functionName += nameDelta;
              }

              var argsDelta = functionData?["arguments"]?.GetValue<string>();
              if (!string.IsNullOrEmpty(argsDelta))
              {
                functionArgs.Append(argsDelta);
              }
            }
            else
            {
              // Regular content streaming
              var contentDelta = delta["content"]?.GetValue<string>();
              if (!string.IsNullOrEmpty(contentDelta))
              {
                fullMessage.Append(contentDelta);

                // Send chunk to client immediately
                await WriteSSEData(new { type = "content", content = contentDelta });

                // Add small delay for typewriter effect
                await Task.Delay(10);
              }
            }
          }
        }
        catch (JsonException)
        {
          // Skip invalid JSON chunks
          continue;
        }
        catch (Exception)
        {
          // Log but continue processing
          continue;
        }
      }

      // Handle function call result
      if (inFunctionCall && !string.IsNullOrEmpty(functionName))
      {
        Console.WriteLine($"[AIAssistant] Processing function call: {functionName}");

        // Handle search_activities function
        if (functionName == "search_activities")
        {
          var searchArgs = JsonSerializer.Deserialize<JsonObject>(functionArgs.ToString());
          var query = searchArgs?["query"]?.GetValue<string>();
          var activityTypeFilter = searchArgs?["activityType"]?.GetValue<string>();

          Console.WriteLine($"[AIAssistant] Searching activities with query: {query}");

          // Send more specific status message with the actual query
          if (!string.IsNullOrEmpty(query))
          {
            await WriteSSEData(new { type = "status", message = $"Searching for activities matching '{query}'..." });
          }

          if (!string.IsNullOrEmpty(query) && !string.IsNullOrEmpty(conversation.CourseId))
          {
            // Get all activities for the course
            var (code, activities) = await _classManager.GetCourseActivitiesAsync(conversation.CourseId, activeOnly: false);

            Console.WriteLine($"[AIAssistant] GetCourseActivitiesAsync result: code={code}, activities count={activities?.Count ?? 0}");

            if (code == ResCode.OK && activities != null)
            {
              // Smart fuzzy search: split query into keywords and check if at least 2 keywords appear in title
              var queryKeywords = query.Split(new[] { ' ', '-', '_' }, StringSplitOptions.RemoveEmptyEntries)
                                      .Select(k => k.ToLower())
                                      .Where(k => k.Length > 2) // Ignore very short words like "a", "an", "the"
                                      .ToList();

              Console.WriteLine($"[AIAssistant] Query keywords: {string.Join(", ", queryKeywords)}");

              var matchingActivities = activities
                .Where(a =>
                {
                  var titleLower = a.Title.ToLower();
                  // Count how many keywords match
                  var matchCount = queryKeywords.Count(keyword => titleLower.Contains(keyword));

                  // Require at least 2 keywords to match (or all keywords if only 1-2 keywords provided)
                  var requiredMatches = queryKeywords.Count <= 2 ? queryKeywords.Count : 2;

                  return matchCount >= requiredMatches;
                })
                .ToList();

              Console.WriteLine($"[AIAssistant] Fuzzy search found {matchingActivities.Count} activities with 2+ keyword matches");

              // If no results with strict matching, try single keyword match as fallback
              if (matchingActivities.Count == 0)
              {
                matchingActivities = activities
                  .Where(a =>
                  {
                    var titleLower = a.Title.ToLower();
                    return queryKeywords.Any(keyword => titleLower.Contains(keyword));
                  })
                  .ToList();

                Console.WriteLine($"[AIAssistant] Fallback to single keyword match: found {matchingActivities.Count} activities");
              }

              // Further filter by activity type if specified
              if (!string.IsNullOrEmpty(activityTypeFilter))
              {
                var typeFilter = activityTypeFilter.ToLower();
                matchingActivities = matchingActivities
                  .Where(a => a.Type.ToString().ToLower() == typeFilter ||
                             (typeFilter == "poll" && a.Type.ToString().ToLower() == "polling"))
                  .ToList();
              }

              // Format results for AI
              var results = matchingActivities.Select(a => new
              {
                activityId = a.Id,
                title = a.Title,
                type = a.Type.ToString().ToLower(),
                description = a.Description,
                isActive = a.IsActive,
                createdAt = a.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")
              }).ToList();

              Console.WriteLine($"[AIAssistant] Found {results.Count} matching activities");

              // Log the matched activities
              foreach (var result in results)
              {
                Console.WriteLine($"[AIAssistant]   - {result.title} (ID: {result.activityId})");
              }

              // If found multiple activities, send them as a selection list to frontend
              if (results.Count > 1)
              {
                // Send activity selection to frontend
                await WriteSSEData(new
                {
                  type = "activity_selection",
                  message = $"I found {results.Count} activities matching '{query}'. Please select which one you'd like to analyze:",
                  activities = results
                });

                var selectionMessage = $"I found {results.Count} activities matching '{query}'. Please select which one you'd like to analyze.";

                // Save messages
                await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
                await _classManager.AddMessageAsync(request.ConversationId, "assistant", selectionMessage);

                await WriteSSEData(new { type = "complete", message = selectionMessage });
                return;
              }

              // If no activities found
              if (results.Count == 0)
              {
                var notFoundMessage = $"I couldn't find any activities matching '{query}' in this course.";
                await WriteSSEData(new { type = "content", content = notFoundMessage });

                await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
                await _classManager.AddMessageAsync(request.ConversationId, "assistant", notFoundMessage);

                await WriteSSEData(new { type = "complete", message = notFoundMessage });
                return;
              }

              // If found exactly one activity, automatically proceed to analyze submissions
              if (results.Count == 1)
              {
                var activityId = results[0].activityId;
                await WriteSSEData(new { type = "status", message = "Retrieving student submissions..." });

                // Get activity details
                var (activityCode, activity) = await _classManager.GetActivityAsync(activityId);

                if (activityCode == ResCode.OK && activity != null)
                {
                  // Get submissions
                  var (subCode, submissions) = await _classManager.GetActivitySubmissionsAsync(activityId);

                  if (subCode == ResCode.OK && submissions != null && submissions.Count > 0)
                  {
                    // Send status update
                    await WriteSSEData(new { type = "status", message = $"Found {submissions.Count} submissions. Loading student information..." });

                    // Get student information
                    var students = new Dictionary<string, string>();
                    var studentIds = submissions.Select(s => s.StudentId).Distinct().ToList();

                    var dbContext = HttpContext.RequestServices
                      .GetRequiredService<InteractiveHub.Service.ClassManagement.Repository.ClassDbContext>();

                    var studentList = await dbContext.Students
                      .Where(s => studentIds.Contains(s.StudentId))
                      .Select(s => new { s.StudentId, s.FullName })
                      .ToListAsync();

                    foreach (var student in studentList)
                    {
                      students[student.StudentId] = student.FullName ?? "Unknown";
                    }

                    // Format submissions data
                    var submissionsData = new
                    {
                      activityId = activity.Id,
                      activityTitle = activity.Title,
                      activityType = activity.Type.ToString().ToLower(),
                      activityDescription = activity.Description,
                      submissionCount = submissions.Count,
                      submissions = submissions.Select(s =>
                      {
                        var baseData = new Dictionary<string, object>
                        {
                          ["studentId"] = s.StudentId,
                          ["studentName"] = students.ContainsKey(s.StudentId) ? students[s.StudentId] : "Unknown",
                          ["submittedAt"] = s.SubmittedAt.ToString("yyyy-MM-dd HH:mm:ss")
                        };

                        if (s is DiscussionSubmission discSub)
                        {
                          baseData["text"] = discSub.Discussion_Text;
                          baseData["isAnonymous"] = discSub.Discussion_IsAnonymous;
                        }
                        else if (s is PollSubmission pollSub)
                        {
                          baseData["selectedOptions"] = pollSub.SelectedOptions;
                        }
                        else if (s is QuizSubmission quizSub)
                        {
                          baseData["answers"] = quizSub.Answers;
                          baseData["score"] = quizSub.Quiz_Score;
                          baseData["timeSpent"] = quizSub.Quiz_TimeSpent;
                        }

                        return baseData;
                      }).ToList()
                    };

                    var submissionsJson = JsonSerializer.Serialize(submissionsData, new JsonSerializerOptions { WriteIndented = true });

                    // Send status update
                    await WriteSSEData(new { type = "status", message = "Analyzing submissions..." });

                    // Get model configuration
                    var analysisMessages = new List<object>
                    {
                      new { role = "system", content = GetSystemPrompt(conversation.ActivityType) },
                      new { role = "user", content = $"Here are the student submissions for the activity \"{activity.Title}\":\n\n{submissionsJson}\n\nOriginal question: {request.Message}\n\nPlease analyze these submissions and provide insights." }
                    };

                    var analysisRequest = new
                    {
                      model = model,
                      messages = analysisMessages,
                      stream = true
                    };

                    var analysisRequestJson = JsonSerializer.Serialize(analysisRequest);
                    var analysisContent = new StringContent(analysisRequestJson, Encoding.UTF8, "application/json");

                    var analysisHttpClient = _httpClientFactory.CreateClient();
                    analysisHttpClient.DefaultRequestHeaders.Clear();
                    analysisHttpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

                    Console.WriteLine($"[AIAssistant] Sending analysis request to {apiEndpoint}");
                    var analysisResponse = await analysisHttpClient.PostAsync(apiEndpoint, analysisContent);

                    Console.WriteLine($"[AIAssistant] Analysis response status: {analysisResponse.StatusCode}");

                    if (analysisResponse.IsSuccessStatusCode)
                    {
                      // Stream analysis response
                      var analysisStream = await analysisResponse.Content.ReadAsStreamAsync();
                      var analysisReader = new StreamReader(analysisStream);
                      var analysisMessage = new StringBuilder();

                      while (!analysisReader.EndOfStream)
                      {
                        var line = await analysisReader.ReadLineAsync();
                        if (string.IsNullOrWhiteSpace(line) || !line.StartsWith("data: "))
                          continue;

                        var data = line.Substring(6).Trim();
                        if (data == "[DONE]")
                          break;

                        try
                        {
                          var chunk = JsonSerializer.Deserialize<JsonObject>(data);
                          var choices = chunk?["choices"]?.AsArray();
                          if (choices == null || choices.Count == 0)
                            continue;

                          var delta = choices[0]?["delta"];
                          var contentDelta = delta?["content"]?.GetValue<string>();

                          if (!string.IsNullOrEmpty(contentDelta))
                          {
                            analysisMessage.Append(contentDelta);
                            await WriteSSEData(new { type = "content", content = contentDelta });
                            await Task.Delay(10);
                          }
                        }
                        catch { continue; }
                      }

                      // Save user message first, then assistant's analysis
                      await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
                      await _classManager.AddMessageAsync(request.ConversationId, "assistant", analysisMessage.ToString());
                      await WriteSSEData(new { type = "complete", message = analysisMessage.ToString() });
                      return;
                    }
                    else
                    {
                      // Handle API error
                      var errorContent = await analysisResponse.Content.ReadAsStringAsync();
                      Console.WriteLine($"[AIAssistant] Analysis API error: Status={analysisResponse.StatusCode}, Content={errorContent}");

                      // Provide user-friendly error messages
                      var errorMsg = analysisResponse.StatusCode switch
                      {
                        System.Net.HttpStatusCode.TooManyRequests =>
                          "Too many requests to AI service. Please wait a moment and try again. The AI service has rate limits to ensure fair usage.",
                        System.Net.HttpStatusCode.Unauthorized =>
                          "AI service authentication failed. Please check API key configuration.",
                        System.Net.HttpStatusCode.ServiceUnavailable =>
                          "AI service is temporarily unavailable. Please try again in a few moments.",
                        _ => $"I encountered an error while analyzing the submissions: {analysisResponse.StatusCode}"
                      };

                      // Save user message first, then error message
                      await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
                      await _classManager.AddMessageAsync(request.ConversationId, "assistant", errorMsg);
                      await WriteSSEData(new { type = "error", message = errorMsg });
                      await WriteSSEData(new { type = "complete", message = errorMsg });
                      return;
                    }
                  }
                  else
                  {
                    // No submissions found - save user message first
                    await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);

                    var noSubMsg = "No submissions found for this activity yet. Students haven't submitted any responses.";
                    await _classManager.AddMessageAsync(request.ConversationId, "assistant", noSubMsg);
                    await WriteSSEData(new { type = "content", content = noSubMsg });
                    await WriteSSEData(new { type = "complete", message = noSubMsg });
                    return;
                  }
                }
              }

              // If exactly one activity found, we've already processed it above
              // This return is for the automatic analysis completion
              return;
            }
            else
            {
              Console.WriteLine($"[AIAssistant] Failed to get activities: code={code}");
              var errorMsg = "I encountered an error while searching for activities. Please try again.";
              await WriteSSEData(new { type = "content", content = errorMsg });

              await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
              await _classManager.AddMessageAsync(request.ConversationId, "assistant", errorMsg);
              await WriteSSEData(new { type = "complete", message = errorMsg });
              return;
            }
          }
          else
          {
            Console.WriteLine($"[AIAssistant] Missing query or courseId: query={query}, courseId={conversation.CourseId}");
            var errorMsg = "I need a search query to find activities. Could you specify what activity you're looking for?";
            await WriteSSEData(new { type = "content", content = errorMsg });

            await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
            await _classManager.AddMessageAsync(request.ConversationId, "assistant", errorMsg);
            await WriteSSEData(new { type = "complete", message = errorMsg });
            return;
          }
        }

        // Handle get_activity_submissions function
        if (functionName == "get_activity_submissions")
        {
          var submissionsArgs = JsonSerializer.Deserialize<JsonObject>(functionArgs.ToString());
          var activityId = submissionsArgs?["activityId"]?.GetValue<string>();
          var includeStudentInfo = submissionsArgs?["includeStudentInfo"]?.GetValue<bool>() ?? true;

          Console.WriteLine($"[AIAssistant] Fetching submissions for activity: {activityId}");

          // Send status message to frontend
          await WriteSSEData(new { type = "status", message = "Retrieving student submissions..." });

          if (!string.IsNullOrEmpty(activityId))
          {
            // Get activity details first
            var (activityCode, activity) = await _classManager.GetActivityAsync(activityId);

            if (activityCode == ResCode.OK && activity != null)
            {
              // Get all submissions for this activity
              var (subCode, submissions) = await _classManager.GetActivitySubmissionsAsync(activityId);

              if (subCode == ResCode.OK && submissions != null && submissions.Count > 0)
              {
                // Send status update
                await WriteSSEData(new { type = "status", message = $"Found {submissions.Count} submissions. Loading student information..." });

                // Get ALL students in the course (not just those who submitted)
                var (allStudentsRes, allStudentsInCourse) = await _classManager.GetStudentsInCourseAsync(activity.CourseId);
                var allStudentsList = new List<object>();
                var submittedStudentIds = submissions.Select(s => s.StudentId).Distinct().ToHashSet();

                if (allStudentsRes.Code == ResCode.OK && allStudentsInCourse != null && allStudentsInCourse.Any())
                {
                  allStudentsList = allStudentsInCourse.Select(s => new
                  {
                    studentId = s.StudentId,
                    studentName = s.FullName ?? "Unknown",
                    email = s.Email,
                    hasSubmitted = submittedStudentIds.Contains(s.StudentId)
                  }).ToList<object>();

                  Console.WriteLine($"[AIAssistant] Total students in course: {allStudentsList.Count}, Submitted: {submissions.Count}, Not submitted: {allStudentsList.Count - submissions.Count}");
                }

                // Get student information for submissions
                var students = new Dictionary<string, string>();
                if (includeStudentInfo)
                {
                  var studentIds = submissions.Select(s => s.StudentId).Distinct().ToList();

                  // Query students directly from database (Submission has no Student navigation property)
                  var dbContext = HttpContext.RequestServices
                    .GetRequiredService<InteractiveHub.Service.ClassManagement.Repository.ClassDbContext>();

                  var studentList = await dbContext.Students
                    .Where(s => studentIds.Contains(s.StudentId))
                    .Select(s => new { s.StudentId, s.FullName })
                    .ToListAsync();

                  foreach (var student in studentList)
                  {
                    students[student.StudentId] = student.FullName ?? "Unknown";
                  }
                }

                // Format submissions data for AI analysis - INCLUDE all students list
                var submissionsData = new
                {
                  activityId = activity.Id,
                  activityTitle = activity.Title,
                  activityType = activity.Type.ToString().ToLower(),
                  activityDescription = activity.Description,
                  totalStudentsInCourse = allStudentsList.Count,
                  submissionCount = submissions.Count,
                  notSubmittedCount = allStudentsList.Count - submissions.Count,
                  allStudents = allStudentsList,
                  submissions = submissions.Select(s =>
                  {
                    var baseData = new Dictionary<string, object>
                    {
                      ["studentId"] = includeStudentInfo ? s.StudentId : "Anonymous",
                      ["studentName"] = includeStudentInfo && students.ContainsKey(s.StudentId) ? students[s.StudentId] : "Anonymous",
                      ["submittedAt"] = s.SubmittedAt.ToString("yyyy-MM-dd HH:mm:ss")
                    };

                    // Add type-specific data
                    if (s is DiscussionSubmission discSub)
                    {
                      baseData["text"] = discSub.Discussion_Text;
                      baseData["isAnonymous"] = discSub.Discussion_IsAnonymous;
                    }
                    else if (s is PollSubmission pollSub)
                    {
                      baseData["selectedOptions"] = pollSub.SelectedOptions;
                    }
                    else if (s is QuizSubmission quizSub)
                    {
                      baseData["answers"] = quizSub.Answers;
                      baseData["score"] = quizSub.Quiz_Score;
                      baseData["timeSpent"] = quizSub.Quiz_TimeSpent;
                    }

                    return baseData;
                  }).ToList()
                };

                var submissionsJson = JsonSerializer.Serialize(submissionsData, new JsonSerializerOptions { WriteIndented = true });
                Console.WriteLine($"[AIAssistant] Retrieved {submissions.Count} submissions");

                // Send status update
                await WriteSSEData(new { type = "status", message = "Analyzing submissions..." });

                // Save user message
                await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);

                // Get model configuration - check LLM:Provider first, then fall back to AI:UseDeepSeek
                var llmProvider = _configuration["LLM:Provider"];
                var useDeepSeek = !string.IsNullOrEmpty(llmProvider)
                    ? llmProvider.Equals("DeepSeek", StringComparison.OrdinalIgnoreCase)
                    : _configuration.GetValue<bool>("AI:UseDeepSeek");

                var modelName = useDeepSeek
                    ? _configuration["DeepSeek:Model"] ?? _configuration["AI:DeepSeek:ModelName"] ?? "deepseek-chat"
                    : _configuration["AI:GitHub:ModelName"] ?? "gpt-4o";
                var apiUrl = useDeepSeek
                    ? _configuration["DeepSeek:ApiUrl"] ?? _configuration["AI:DeepSeek:ApiUrl"] ?? "https://api.deepseek.com/v1/chat/completions"
                    : _configuration["AI:GitHub:ApiUrl"] ?? "https://models.inference.ai.azure.com/chat/completions";

                Console.WriteLine($"[AIAssistant] Using provider: {(useDeepSeek ? "DeepSeek" : "GitHub")}, Model: {modelName}, API: {apiUrl}");

                // Create a second API call to continue the conversation with submission data
                var analysisMessages = new List<object>
                {
                  new { role = "system", content = GetSystemPrompt(conversation.ActivityType) },
                  new { role = "user", content = $@"Here is the complete information for the activity ""{activity.Title}"":

{submissionsJson}

Original question: {request.Message}

IMPORTANT INSTRUCTIONS:
- The data includes 'allStudents' list showing ALL students enrolled in the course
- Each student in 'allStudents' has a 'hasSubmitted' field indicating if they completed the activity
- The 'submissions' array contains detailed data for students who submitted
- When asked about who didn't complete/finish/submit, use the 'allStudents' list where 'hasSubmitted' is false
- Provide clear, direct answers listing student names and IDs
- Use the 'totalStudentsInCourse', 'submissionCount', and 'notSubmittedCount' to give statistics

Please analyze and answer the question directly." }
                };

                var analysisRequest = new
                {
                  model = modelName,
                  messages = analysisMessages,
                  stream = true
                };

                var analysisRequestJson = JsonSerializer.Serialize(analysisRequest);
                var analysisContent = new StringContent(analysisRequestJson, Encoding.UTF8, "application/json");

                var analysisHttpClient = _httpClientFactory.CreateClient();
                analysisHttpClient.DefaultRequestHeaders.Clear();

                // Get API key based on provider
                var analysisApiKey = useDeepSeek
                    ? _configuration["DeepSeek:ApiKey"]
                    : _configuration["GitHub:Token"];

                if (string.IsNullOrEmpty(analysisApiKey))
                {
                  var errorMsg = "API key not configured";
                  Console.WriteLine($"[AIAssistant] {errorMsg}");
                  await WriteSSEData(new { type = "error", message = errorMsg });
                  await WriteSSEData(new { type = "complete", message = errorMsg });
                  await _classManager.AddMessageAsync(request.ConversationId, "assistant", errorMsg);
                  return;
                }

                analysisHttpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {analysisApiKey}");

                Console.WriteLine($"[AIAssistant] Sending analysis request to {apiUrl} with model {modelName}");
                var analysisResponse = await analysisHttpClient.PostAsync(apiUrl, analysisContent); if (!analysisResponse.IsSuccessStatusCode)
                {
                  var errorContent = await analysisResponse.Content.ReadAsStringAsync();
                  Console.WriteLine($"[AIAssistant] Analysis API error: Status={analysisResponse.StatusCode}, Content={errorContent}");

                  // Provide user-friendly error messages based on status code
                  var errorMsg = analysisResponse.StatusCode switch
                  {
                    System.Net.HttpStatusCode.TooManyRequests =>
                      "Too many requests to AI service. Please wait a moment and try again. The AI service has rate limits to ensure fair usage.",
                    System.Net.HttpStatusCode.Unauthorized =>
                      "AI service authentication failed. Please check API key configuration.",
                    System.Net.HttpStatusCode.ServiceUnavailable =>
                      "AI service is temporarily unavailable. Please try again in a few moments.",
                    _ => $"Failed to analyze submissions: {analysisResponse.StatusCode}. {errorContent}"
                  };

                  await WriteSSEData(new { type = "error", message = errorMsg });
                  await WriteSSEData(new { type = "complete", message = errorMsg });

                  await _classManager.AddMessageAsync(request.ConversationId, "assistant", errorMsg);
                  return;
                }

                // Stream analysis response
                var analysisStream = await analysisResponse.Content.ReadAsStreamAsync();
                var analysisReader = new StreamReader(analysisStream);
                var analysisMessage = new StringBuilder();

                while (!analysisReader.EndOfStream)
                {
                  var line = await analysisReader.ReadLineAsync();
                  if (string.IsNullOrWhiteSpace(line) || !line.StartsWith("data: "))
                    continue;

                  var data = line.Substring(6).Trim();
                  if (data == "[DONE]")
                    break;

                  try
                  {
                    var chunk = JsonSerializer.Deserialize<JsonObject>(data);
                    var choices = chunk?["choices"]?.AsArray();
                    if (choices == null || choices.Count == 0)
                      continue;

                    var delta = choices[0]?["delta"];
                    var contentDelta = delta?["content"]?.GetValue<string>();

                    if (!string.IsNullOrEmpty(contentDelta))
                    {
                      analysisMessage.Append(contentDelta);
                      await WriteSSEData(new { type = "content", content = contentDelta });
                      await Task.Delay(10);
                    }
                  }
                  catch (Exception ex)
                  {
                    Console.WriteLine($"[AIAssistant] Error parsing analysis chunk: {ex.Message}");
                    continue;
                  }
                }

                // Save analysis message
                await _classManager.AddMessageAsync(request.ConversationId, "assistant", analysisMessage.ToString());
                await WriteSSEData(new { type = "complete", message = analysisMessage.ToString() });
                return;
              }
              else
              {
                // No submissions yet - get list of all students in the course
                await WriteSSEData(new { type = "status", message = "No submissions found. Retrieving list of all students in the course..." });

                // Get all students in the course
                var (studentsRes, allStudents) = await _classManager.GetStudentsInCourseAsync(activity.CourseId);

                if (studentsRes.Code == ResCode.OK && allStudents != null && allStudents.Any())
                {
                  // Format student list
                  var studentList = allStudents.Select(s => new
                  {
                    studentId = s.StudentId,
                    studentName = s.FullName ?? "Unknown",
                    email = s.Email
                  }).ToList();

                  var noSubmissionsData = new
                  {
                    activityId = activity.Id,
                    activityTitle = activity.Title,
                    activityType = activity.Type.ToString().ToLower(),
                    activityDescription = activity.Description,
                    submissionCount = 0,
                    totalStudents = studentList.Count,
                    studentsWhoHaventSubmitted = studentList
                  };

                  var noSubmissionsJson = JsonSerializer.Serialize(noSubmissionsData, new JsonSerializerOptions { WriteIndented = true });
                  Console.WriteLine($"[AIAssistant] Activity has no submissions. Total students: {studentList.Count}");

                  // Save user message
                  await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);

                  // Get model configuration
                  var llmProvider = _configuration["LLM:Provider"];
                  var useDeepSeek = !string.IsNullOrEmpty(llmProvider)
                      ? llmProvider.Equals("DeepSeek", StringComparison.OrdinalIgnoreCase)
                      : _configuration.GetValue<bool>("AI:UseDeepSeek");

                  var modelName = useDeepSeek
                      ? _configuration["DeepSeek:Model"] ?? _configuration["AI:DeepSeek:ModelName"] ?? "deepseek-chat"
                      : _configuration["AI:GitHub:ModelName"] ?? "gpt-4o";
                  var apiUrl = useDeepSeek
                      ? _configuration["DeepSeek:ApiUrl"] ?? _configuration["AI:DeepSeek:ApiUrl"] ?? "https://api.deepseek.com/v1/chat/completions"
                      : _configuration["AI:GitHub:ApiUrl"] ?? "https://models.inference.ai.azure.com/chat/completions";

                  // Create analysis with student list
                  var analysisMessages = new List<object>
                  {
                    new { role = "system", content = GetSystemPrompt(conversation.ActivityType) },
                    new { role = "user", content = $"Here is the information about the activity \"{activity.Title}\":\n\n{noSubmissionsJson}\n\nOriginal question: {request.Message}\n\nNo students have submitted yet. Please provide the list of students who haven't finished the activity." }
                  };

                  var analysisRequest = new
                  {
                    model = modelName,
                    messages = analysisMessages,
                    stream = true
                  };

                  var analysisRequestJson = JsonSerializer.Serialize(analysisRequest);
                  var analysisContent = new StringContent(analysisRequestJson, Encoding.UTF8, "application/json");

                  var analysisHttpRequest = new HttpRequestMessage(HttpMethod.Post, apiUrl)
                  {
                    Content = analysisContent
                  };

                  if (useDeepSeek)
                  {
                    var deepSeekKey = _configuration["DeepSeek:ApiKey"] ?? _configuration["AI:DeepSeek:ApiKey"];
                    analysisHttpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", deepSeekKey);
                  }
                  else
                  {
                    var githubToken = _configuration["AI:GitHub:Token"];
                    analysisHttpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", githubToken);
                  }

                  await WriteSSEData(new { type = "status", message = "Analyzing student list..." });

                  var analysisResponse = await httpClient.SendAsync(analysisHttpRequest, HttpCompletionOption.ResponseHeadersRead);

                  if (!analysisResponse.IsSuccessStatusCode)
                  {
                    var errorContent = await analysisResponse.Content.ReadAsStringAsync();
                    Console.WriteLine($"[AIAssistant] Analysis API error: {analysisResponse.StatusCode} - {errorContent}");

                    var errorMessage = analysisResponse.StatusCode switch
                    {
                      System.Net.HttpStatusCode.TooManyRequests => "The AI service is currently experiencing high demand. Please try again in a few moments.",
                      System.Net.HttpStatusCode.Unauthorized => "AI service authentication failed. Please contact the administrator.",
                      System.Net.HttpStatusCode.ServiceUnavailable => "The AI service is temporarily unavailable. Please try again later.",
                      _ => $"Failed to analyze student list. Error: {analysisResponse.StatusCode}"
                    };

                    await _classManager.AddMessageAsync(request.ConversationId, "assistant", errorMessage);
                    await WriteSSEData(new { type = "error", message = errorMessage });
                    return;
                  }

                  var analysisStream = await analysisResponse.Content.ReadAsStreamAsync();
                  var analysisReader = new StreamReader(analysisStream);
                  var analysisMessage = new StringBuilder();

                  while (!analysisReader.EndOfStream)
                  {
                    var line = await analysisReader.ReadLineAsync();
                    if (string.IsNullOrWhiteSpace(line) || !line.StartsWith("data: "))
                      continue;

                    var data = line.Substring(6).Trim();
                    if (data == "[DONE]")
                      break;

                    try
                    {
                      var chunk = JsonSerializer.Deserialize<JsonObject>(data);
                      var choices = chunk?["choices"]?.AsArray();
                      if (choices == null || choices.Count == 0)
                        continue;

                      var delta = choices[0]?["delta"];
                      var contentDelta = delta?["content"]?.GetValue<string>();

                      if (!string.IsNullOrEmpty(contentDelta))
                      {
                        analysisMessage.Append(contentDelta);
                        await WriteSSEData(new { type = "content", content = contentDelta });
                        await Task.Delay(10);
                      }
                    }
                    catch (Exception ex)
                    {
                      Console.WriteLine($"[AIAssistant] Error parsing analysis chunk: {ex.Message}");
                      continue;
                    }
                  }

                  // Save analysis message
                  await _classManager.AddMessageAsync(request.ConversationId, "assistant", analysisMessage.ToString());
                  await WriteSSEData(new { type = "complete", message = analysisMessage.ToString() });
                  return;
                }
                else
                {
                  await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
                  var errorMsg = "No submissions found and unable to retrieve student list for this course.";
                  await _classManager.AddMessageAsync(request.ConversationId, "assistant", errorMsg);
                  await WriteSSEData(new { type = "content", content = errorMsg });
                  await WriteSSEData(new { type = "complete", message = errorMsg });
                  return;
                }
              }
            }
            else
            {
              await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
              var errorMsg = $"Activity with ID '{activityId}' not found. Please check the activity ID and try again.";
              await _classManager.AddMessageAsync(request.ConversationId, "assistant", errorMsg);
              await WriteSSEData(new { type = "content", content = errorMsg });
              await WriteSSEData(new { type = "complete", message = errorMsg });
              return;
            }
          }
          else
          {
            await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
            var errorMsg = "Activity ID is required to retrieve submissions. Please provide the activity ID.";
            await _classManager.AddMessageAsync(request.ConversationId, "assistant", errorMsg);
            await WriteSSEData(new { type = "content", content = errorMsg });
            await WriteSSEData(new { type = "complete", message = errorMsg });
            return;
          }
        }

        // Handle create activity functions
        var activityData = JsonSerializer.Deserialize<JsonObject>(functionArgs.ToString());

        // Infer activity type from function name
        string inferredActivityType = functionName switch
        {
          "create_quiz_activity" => "quiz",
          "create_poll_activity" => "poll",
          "create_discussion_activity" => "discussion",
          _ => conversation.ActivityType // Fallback to conversation type
        };

        Console.WriteLine($"[AIAssistant] Function name: {functionName}, Inferred activity type: {inferredActivityType}, Conversation type: {conversation.ActivityType}");

        // Extract activity title from the function arguments to include in the message
        string activityTitle = activityData?["title"]?.GetValue<string>() ?? "Untitled Activity";
        var message = $"I've prepared a {inferredActivityType} activity for you: **{activityTitle}**. You can preview it before creating.";

        // Save messages first to get the assistant message ID
        await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
        var (msgCode, assistantMessage) = await _classManager.AddMessageAsync(request.ConversationId, "assistant", message);

        // Save activity preview with the inferred activity type and assistant message ID
        var (saveCode, preview) = await _classManager.SaveActivityPreviewAsync(
            request.ConversationId,
            inferredActivityType,
            functionArgs.ToString(),
            assistantMessage?.Id  // Pass the message ID
        );

        if (saveCode == ResCode.OK && preview != null)
        {
          await WriteSSEData(new
          {
            type = "function_call",
            function_name = functionName,
            activity_data = activityData,
            preview_id = preview.Id
          });
        }
        else
        {
          await WriteSSEData(new
          {
            type = "function_call",
            function_name = functionName,
            activity_data = activityData
          });
        }

        await WriteSSEData(new { type = "complete", message = message, has_activity_data = true, preview_id = preview?.Id });
      }
      else
      {
        var message = fullMessage.ToString();

        // Fallback: Detect if AI is describing search results without actually calling function
        if (message.Contains("found") && message.Contains("activities") && message.Contains("matching") &&
            message.Contains("select") && !string.IsNullOrEmpty(conversation.CourseId))
        {
          Console.WriteLine($"[AIAssistant] Detected AI describing search results without function call. Auto-executing search...");

          // Extract query from user message
          var userMessageLower = request.Message.ToLower();
          var keywords = request.Message.Split(new[] { ' ', ',', '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries)
                                       .Where(w => w.Length > 3 && !new[] { "help", "please", "analys", "analyze", "check", "review", "the", "this", "that" }.Contains(w.ToLower()))
                                       .Take(5)
                                       .ToList();

          if (keywords.Count > 0)
          {
            var searchQuery = string.Join(" ", keywords);
            Console.WriteLine($"[AIAssistant] Auto-search with extracted keywords: {searchQuery}");

            var (code, activities) = await _classManager.GetCourseActivitiesAsync(conversation.CourseId, activeOnly: false);

            if (code == ResCode.OK && activities != null)
            {
              var queryKeywords = searchQuery.Split(new[] { ' ', '-', '_' }, StringSplitOptions.RemoveEmptyEntries)
                                            .Select(k => k.ToLower())
                                            .Where(k => k.Length > 2)
                                            .ToList();

              var matchingActivities = activities
                .Where(a =>
                {
                  var titleLower = a.Title.ToLower();
                  var matchCount = queryKeywords.Count(keyword => titleLower.Contains(keyword));
                  var requiredMatches = queryKeywords.Count <= 2 ? queryKeywords.Count : 2;
                  return matchCount >= requiredMatches;
                })
                .ToList();

              if (matchingActivities.Count > 0)
              {
                var results = matchingActivities.Select(a => new
                {
                  activityId = a.Id,
                  title = a.Title,
                  type = a.Type.ToString().ToLower(),
                  description = a.Description,
                  isActive = a.IsActive,
                  createdAt = a.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")
                }).ToList();

                Console.WriteLine($"[AIAssistant] Auto-search found {results.Count} activities");

                if (results.Count >= 1)
                {
                  // Override AI's text response with actual selection cards
                  await WriteSSEData(new
                  {
                    type = "activity_selection",
                    message = $"I found {results.Count} activity(ies). Please select which one:",
                    activities = results
                  });

                  await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
                  await _classManager.AddMessageAsync(request.ConversationId, "assistant", $"I found {results.Count} activity(ies). Please select which one.");

                  await WriteSSEData(new { type = "complete", message = "" });
                  return;
                }
              }
            }
          }
        }

        // Save messages
        await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
        await _classManager.AddMessageAsync(request.ConversationId, "assistant", message);

        await WriteSSEData(new { type = "complete", message = message, has_activity_data = false });
      }
    }
    catch (Exception ex)
    {
      Console.WriteLine($"[AIAssistant] Exception caught: {ex.Message}");
      Console.WriteLine($"[AIAssistant] Stack trace: {ex.StackTrace}");

      // Save messages even in error case
      try
      {
        await _classManager.AddMessageAsync(request.ConversationId, "user", request.Message, request.PdfContent);
        await _classManager.AddMessageAsync(request.ConversationId, "assistant", $"Error: {ex.Message}");
      }
      catch (Exception saveEx)
      {
        Console.WriteLine($"[AIAssistant] Failed to save error messages: {saveEx.Message}");
      }

      await WriteSSEError($"Error: {ex.Message}");
      await WriteSSEData(new { type = "complete", message = $"Error: {ex.Message}" });
    }
  }

  // Helper methods for SSE
  private async Task WriteSSEData(object data)
  {
    var json = JsonSerializer.Serialize(data);
    await Response.WriteAsync($"data: {json}\n\n");
    await Response.Body.FlushAsync(); // CRITICAL: Flush immediately after every write
  }

  private async Task WriteSSEError(string error)
  {
    await WriteSSEData(new { type = "error", error = error });
    await Response.Body.FlushAsync();
  }

  private string GetSystemPrompt(string activityType)
  {
    // Use unified system prompt that allows creating any type of activity
    return @"You are a versatile AI assistant helping instructors create various educational activities including quizzes, polls, and discussions.

Your role is to:
1. Understand the instructor's needs and the type of activity they want to create
2. Analyze any provided materials (text, PDFs, lecture notes, topics)
3. Generate appropriate content based on the activity type requested
4. Call the relevant function (create_quiz_activity, create_poll_activity, or create_discussion_activity) when ready
5. Provide helpful suggestions and engage in conversation to refine the activity
6. **REMEMBER the context**: Pay attention to activities mentioned or created in the conversation history

Guidelines:
- **For creating quizzes, polls, or discussions**:
  * **Use sensible defaults if not specified**: If the instructor doesn't provide difficulty level, number of questions, or other details, use these defaults:
    - Number of questions: 10 questions
    - Difficulty level: Mixed (include beginner, intermediate, and some advanced questions)
    - Time limit for quizzes: 600 seconds (10 minutes)
    - Show correct answers: true
    - Shuffle questions: true
  * **DO NOT keep asking for details** - If user says 'create a quiz about X', just create it with defaults
  * Only ask for clarification if the topic itself is unclear or too broad
  * You can mention the defaults you're using in your response (e.g., 'I will create a 10-question quiz with mixed difficulty...')
- For quizzes: Create questions that test understanding, not just memorization. Provide clear explanations.
- **For polls**:
  * MUST generate at least 2-5 options for students to choose from
  * Each option should be clear and concise
  * Options should cover different perspectives or choices
  * Example poll options: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree']
  * CRITICAL: Always include an 'options' array in the poll data with text for each option
- For discussions: Create thought-provoking prompts that encourage critical thinking and diverse perspectives.
- **Context Awareness**:
  * When you see a message like 'I've prepared a quiz activity for you' or 'Activity Created: [Title]', remember that activity was just created
  * If the instructor immediately asks to analyze 'the quiz' or 'that quiz', they are referring to the most recently created activity in this conversation
  * Look for activity titles in the conversation history before asking for clarification
- **IMPORTANT - For analyzing submissions**:
  * When instructor asks to 'analyze', 'check', 'review', or 'look at' an activity or submissions, you MUST use functions
  * **MANDATORY RULE**: If user mentions 'quiz', 'poll', 'discussion', or 'activity' with analyze/check/review keywords, IMMEDIATELY call search_activities with relevant keywords
  * **DO NOT ask for clarification** - Instead, call search_activities with the keywords from the user's message
  * **STEP 1**: ALWAYS call search_activities first to find matching activities
  * **STEP 2**: If multiple results found, the system will show cards for user selection
  * **STEP 3**: After user selects or if only one result, call get_activity_submissions with that activity ID
  * Example: User says 'analyze the quiz' -> You MUST call search_activities(query='quiz') RIGHT AWAY
  * Example: User says 'help me analyze heap structure quiz' -> You MUST call search_activities(query='heap structure quiz') RIGHT AWAY
  * **FORBIDDEN**: Do NOT reply with text asking what quiz - call search_activities instead!
  * Never guess or invent activity IDs - they must come from search_activities results
- Always be responsive to the instructor's specific requirements and context.
- If the instructor asks for a different activity type than initially specified, you can create that type instead.";
  }

  private object[] GetFunctionDefinitions(string activityType)
  {
    // Return all function definitions to allow creating any type of activity
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
            properties = new
            {
              title = new { type = "string", description = "The title of the quiz" },
              description = new { type = "string", description = "A brief description of the quiz" },
              timeLimit = new { type = "integer", description = "Time limit in seconds" },
              showCorrectAnswers = new { type = "boolean" },
              shuffleQuestions = new { type = "boolean" },
              questions = new
              {
                type = "array",
                items = new
                {
                  type = "object",
                  properties = new
                  {
                    text = new { type = "string" },
                    options = new { type = "array", items = new { type = "string" } },
                    correctAnswer = new { type = "integer" },
                    points = new { type = "integer" },
                    explanation = new { type = "string" }
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
          description = "Create a poll activity for gathering student opinions or feedback. MUST include at least 2 options in the options array.",
          parameters = new
          {
            type = "object",
            properties = new
            {
              title = new { type = "string", description = "The title of the poll" },
              description = new { type = "string", description = "A brief description of the poll" },
              allowMultipleSelections = new { type = "boolean", description = "Whether students can select multiple options (default: false)" },
              isAnonymous = new { type = "boolean", description = "Whether responses are anonymous (default: true)" },
              options = new
              {
                type = "array",
                description = "REQUIRED: Array of poll options for students to choose from. Must have at least 2 options. Each option should have a 'text' field.",
                items = new
                {
                  type = "object",
                  properties = new
                  {
                    text = new { type = "string", description = "The option text (REQUIRED)" },
                    imageUrl = new { type = "string", description = "Optional image URL for the option" }
                  },
                  required = new[] { "text" }
                },
                minItems = 2
              }
            },
            required = new[] { "title", "options" }
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
          description = "Create a discussion activity to encourage student conversation and critical thinking",
          parameters = new
          {
            type = "object",
            properties = new
            {
              title = new { type = "string", description = "The title of the discussion" },
              description = new { type = "string", description = "The discussion prompt or question" },
              maxLength = new { type = "integer", description = "Maximum length of responses in characters" },
              allowAnonymous = new { type = "boolean", description = "Whether to allow anonymous posts" },
              requireApproval = new { type = "boolean", description = "Whether posts require instructor approval" }
            }
          }
        }
      },
      // Search Activities
      new
      {
        type = "function",
        function = new
        {
          name = "search_activities",
          description = "Search for activities by title or keywords. Use this when the instructor mentions an activity name but doesn't provide the activity ID. Returns a list of matching activities with their IDs.",
          parameters = new
          {
            type = "object",
            properties = new
            {
              query = new { type = "string", description = "The search query (activity title or keywords)" },
              activityType = new { type = "string", description = "Optional: filter by activity type (quiz, poll, discussion)" }
            },
            required = new[] { "query" }
          }
        }
      },
      // Get Activity Submissions for Analysis
      new
      {
        type = "function",
        function = new
        {
          name = "get_activity_submissions",
          description = "Retrieve student submissions for a specific activity to analyze responses, identify patterns, or evaluate student understanding. Use this when the instructor asks to analyze student answers, compare responses, find creative submissions, or evaluate learning outcomes.",
          parameters = new
          {
            type = "object",
            properties = new
            {
              activityId = new { type = "string", description = "The ID of the activity to retrieve submissions for" },
              includeStudentInfo = new { type = "boolean", description = "Whether to include student names and IDs (default: true)" }
            },
            required = new[] { "activityId" }
          }
        }
      }
    };
  }

  /// <summary>
  /// Get conversation details with all messages
  /// </summary>
  [HttpGet("GetConversation/{conversationId}")]
  [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult<ConversationDto>))]
  [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(HttpResult))]
  public async Task<IActionResult> GetConversation(string conversationId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var (code, conversation) = await _classManager.GetConversationAsync(conversationId);

      if (code != ResCode.OK || conversation == null)
      {
        return ReturnResponse(new ServiceRes(code, "Conversation not found"));
      }

      Console.WriteLine($"[AIAssistant] GetConversation: Found {conversation.Messages?.Count ?? 0} messages for conversation {conversationId}");

      var dto = ConversationToDto(conversation);

      Console.WriteLine($"[AIAssistant] GetConversation: DTO has {dto.Messages?.Count ?? 0} messages");

      return ReturnOK(dto);
    });
  }

  /// <summary>
  /// Get all conversations for the current instructor
  /// </summary>
  [HttpGet("GetMyConversations")]
  [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult<List<ConversationDto>>))]
  [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
  public async Task<IActionResult> GetMyConversations([FromQuery] string? courseId = null, [FromQuery] bool includeCompleted = true)
  {
    return await HandleWithResultAsync(async () =>
    {
      var instructorId = User.FindFirst("sub")?.Value ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
      if (string.IsNullOrEmpty(instructorId))
      {
        return ReturnResponse(new ServiceRes(ResCode.Unauthorized, "User not authenticated"));
      }

      var (code, conversations) = await _classManager.GetInstructorConversationsAsync(
              instructorId,
              courseId,
              includeCompleted
          );

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes(code, "Failed to retrieve conversations"));
      }

      var dtos = conversations.Select(c => ConversationToDto(c)).ToList();
      return ReturnOK(dtos);
    });
  }

  /// <summary>
  /// Complete conversation and create activity from AI-generated data
  /// </summary>
  [HttpPost("CompleteConversation")]
  [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult<object>))]
  [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
  public async Task<IActionResult> CompleteConversation([FromBody] CompleteConversationRequest request)
  {
    return await HandleWithResultAsync(async () =>
    {
      if (request.ActivityData == null)
      {
        return ReturnResponse(new ServiceRes(ResCode.InvalidCourseData, "Activity data is required"));
      }

      // Check if preview is already created
      if (!string.IsNullOrEmpty(request.PreviewId))
      {
        var (previewCode, previews) = await _classManager.GetConversationPreviewsAsync(request.ConversationId);
        if (previewCode == ResCode.OK)
        {
          var existingPreview = previews.FirstOrDefault(p => p.Id == request.PreviewId);
          if (existingPreview != null && existingPreview.IsCreated)
          {
            return ReturnResponse(new ServiceRes(ResCode.InvalidCourseData, "This preview has already been used to create an activity"));
          }
        }
      }

      // Get conversation to determine activity type
      var (getCode, conversation) = await _classManager.GetConversationAsync(request.ConversationId);
      if (getCode != ResCode.OK || conversation == null)
      {
        return ReturnResponse(new ServiceRes(getCode, "Conversation not found"));
      }

      // Determine activity type from ActivityData if available, otherwise use conversation type
      string activityTypeString;
      if (request.ActivityData.TryGetPropertyValue("type", out var typeNode))
      {
        activityTypeString = typeNode?.ToString()?.ToLower() ?? conversation.ActivityType.ToLower();
        Console.WriteLine($"[AIAssistant] Using activity type from ActivityData: {activityTypeString}");
      }
      else
      {
        activityTypeString = conversation.ActivityType.ToLower();
        Console.WriteLine($"[AIAssistant] Using activity type from Conversation: {activityTypeString}");
      }

      // Parse activity type
      var activityType = activityTypeString switch
      {
        "quiz" => ActivityType.Quiz,
        "poll" => ActivityType.Polling,
        "discussion" => ActivityType.Discussion,
        _ => throw new ArgumentException($"Invalid activity type: {activityTypeString}")
      };

      // Create activity using the AI-generated data
      var (createCode, activity) = await _classManager.CreateActivityAsync(
              conversation.CourseId,
              activityType,
              request.ActivityData
          );

      if (createCode != ResCode.OK || activity == null)
      {
        return ReturnResponse(new ServiceRes(createCode, "Failed to create activity"));
      }

      // Mark preview as created if previewId provided
      if (!string.IsNullOrEmpty(request.PreviewId))
      {
        await _classManager.MarkPreviewAsCreatedAsync(request.PreviewId, activity.Id);
      }

      // Mark conversation as completed with the generated activity ID
      var (completeCode, completedConversation) = await _classManager.CompleteConversationAsync(
              request.ConversationId,
              activity.Id
          );

      if (completeCode != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes(completeCode, "Failed to complete conversation"));
      }

      return ReturnOK(new { ActivityId = activity.Id, Activity = activity }, "Activity created successfully");
    });
  }

  /// <summary>
  /// Upload and extract text from PDF
  /// </summary>
  [HttpPost("UploadPdf")]
  [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult<string>))]
  [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
  public async Task<IActionResult> UploadPdf([FromBody] UploadPdfRequest request)
  {
    return await HandleWithResultAsync(async () =>
    {
      // Decode base64 content
      byte[] pdfBytes;
      try
      {
        pdfBytes = Convert.FromBase64String(request.Base64Content);
      }
      catch (FormatException)
      {
        return ReturnResponse(new ServiceRes(ResCode.InvalidCourseData, "Invalid base64 content"));
      }

      // TODO: Implement actual PDF text extraction
      // For now, return a placeholder
      var extractedText = "[PDF text extraction not yet implemented]";

      // Save PDF record
      var (code, pdfFile) = await _classManager.UploadPdfFileAsync(
              request.ConversationId,
              request.FileName,
              pdfBytes.Length,
              extractedText
          );

      if (code != ResCode.OK || pdfFile == null)
      {
        return ReturnResponse(new ServiceRes(code, "Failed to save PDF record"));
      }

      return ReturnOK(extractedText, "PDF uploaded and processed successfully");
    });
  }

  /// <summary>
  /// Delete a conversation
  /// </summary>
  [HttpDelete("DeleteConversation/{conversationId}")]
  [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult))]
  [ProducesResponseType(StatusCodes.Status404NotFound, Type = typeof(HttpResult))]
  public async Task<IActionResult> DeleteConversation(string conversationId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var code = await _classManager.DeleteConversationAsync(conversationId);

      if (code == ResCode.ActivityNotFound)
      {
        return ReturnResponse(new ServiceRes(code, "Conversation not found"));
      }

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes(code, "Failed to delete conversation"));
      }

      return ReturnOK(null, "Conversation deleted successfully");
    });
  }

  // Helper method to convert model to DTO
  private ConversationDto ConversationToDto(AIConversation conversation)
  {
    return new ConversationDto
    {
      Id = conversation.Id,
      CourseId = conversation.CourseId,
      InstructorId = conversation.InstructorId,
      ActivityType = conversation.ActivityType,
      Title = conversation.Title,
      IsCompleted = conversation.IsCompleted,
      GeneratedActivityId = conversation.GeneratedActivityId,
      CreatedAt = DateTime.SpecifyKind(conversation.CreatedAt, DateTimeKind.Utc),
      UpdatedAt = DateTime.SpecifyKind(conversation.UpdatedAt, DateTimeKind.Utc),
      Messages = conversation.Messages?.Select(m => new ConversationMessageDto
      {
        Id = m.Id,
        Role = m.Role,
        Content = m.Content,
        PdfContent = m.PdfContent,
        Order = m.Order,
        CreatedAt = DateTime.SpecifyKind(m.CreatedAt, DateTimeKind.Utc)
      }).ToList() ?? new List<ConversationMessageDto>(),
      ActivityPreviews = conversation.ActivityPreviews?.Select(p => new ActivityPreviewDto
      {
        Id = p.Id,
        ConversationId = p.ConversationId,
        MessageId = p.MessageId,
        ActivityType = p.ActivityType,
        ActivityData = string.IsNullOrEmpty(p.ActivityDataJson) ? null : JsonSerializer.Deserialize<JsonObject>(p.ActivityDataJson),
        IsCreated = p.IsCreated,
        CreatedActivityId = p.CreatedActivityId,
        Order = p.Order,
        CreatedAt = DateTime.SpecifyKind(p.CreatedAt, DateTimeKind.Utc)
      }).ToList() ?? new List<ActivityPreviewDto>()
    };
  }
}
