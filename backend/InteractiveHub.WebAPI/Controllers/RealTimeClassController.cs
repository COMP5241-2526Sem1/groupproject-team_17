using System.Text.Json.Nodes;
using InteractiveHub.Service;
using InteractiveHub.Service.ClassManagement;
using InteractiveHub.Service.Shared.Extensions;
using InteractiveHub.WebAPI;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;


[Route("api/[controller]")]
[ApiController]
public partial class RealTimeClassController : IHControllerBase
{
  private readonly IClassManager _classManager;

  public RealTimeClassController(IClassManager classManager, IHubLogger logger) : base(logger)
  {
    _classManager = classManager;
  }
}
public partial class RealTimeClassController
{
  [HttpGet("{joinCodeStr}")]
  public async Task<IActionResult> GetCourseJoinInfo(string joinCodeStr)
  {
    return await HandleWithResultAsync(async () =>
    {
      (ResCode resCode, JoinClassDto? course) result = await _classManager.GetCourseJoinInfo(joinCodeStr);
      if (result.resCode != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = result.resCode,
          Message = "Failed to get course join info."
        });
      }
      return ReturnOK(result.course);
    });
  }
  [HttpPost("StudentJoin")]
  public async Task<IActionResult> StudentJoinCourse([FromBody] JsonObject value)
  {



    return await HandleWithResultAsync(async () =>
    {
      string courseId = value["courseId"]!.GetValue<string>();
      string studentId = value["studentId"]!.GetValue<string>();
      string? studentName = value["studentName"]?.GetValue<string>();
      string? email = value["email"]?.GetValue<string>();
      string? pin = value["pin"]?.GetValue<string>();
      (ResCode resCode, JoinedStudent?) result = await _classManager.StudentJoinCourse(courseId, studentId, studentName, email, pin);
      if (result.resCode != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = result.resCode,
          Message = result.resCode.ToDescriptionString() ?? "Failed to join course."
        });
      }
      return ReturnOK(result.Item2);
    });
  }
  // WebSocket endpoint to connect to a real-time class (for students)
  [HttpGet("Connect/{token}")]
  public async Task<IActionResult> ConnectToRealTimeClass(string token)
  {
    if (HttpContext.WebSockets.IsWebSocketRequest)
    {
      // Decode the URL-encoded token
      var decodedToken = Uri.UnescapeDataString(token);
      var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
      await _classManager.HandleNewWebsocketConnection(decodedToken, webSocket);
      return new EmptyResult();
    }
    else
    {
      return ReturnResponse(new ServiceRes
      {
        Code = ResCode.ExpectedWSRequest,
        Message = "WebSocket request expected."
      });
    }
  }

  // WebSocket endpoint for instructors to connect to their classroom
  [HttpGet("ConnectInstructor/{courseId}")]
  public async Task<IActionResult> ConnectInstructorToClass(string courseId)
  {
    if (HttpContext.WebSockets.IsWebSocketRequest)
    {
      var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
      await _classManager.HandleInstructorWebsocketConnection(courseId, webSocket);
      return new EmptyResult();
    }
    else
    {
      return ReturnResponse(new ServiceRes
      {
        Code = ResCode.ExpectedWSRequest,
        Message = "WebSocket request expected."
      });
    }
  }

  [HttpPost("ValidateJoinToken")]
  public async Task<IActionResult> ValidateJoinToken([FromBody] JsonObject value)
  {
    return await HandleWithResultAsync(async () =>
    {
      string joinToken = value["token"]?.GetValue<string>() ?? "invalid token";
      (ResCode resCode, JoinedStudent? student, JoinClassDto? joinClassDto) result = _classManager.ValidateSessionToken(joinToken);
      if (result.resCode != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = result.resCode,
          Message = result.resCode.ToDescriptionString() ?? "Invalid join token."
        });
      }
      var response = new
      {
        Student = result.student,
        Course = result.joinClassDto
      };
      return ReturnOK(response);
    });


  }

  /// <summary>
  /// Get real-time classroom status (current activity and joined students count)
  /// </summary>
  /// <param name="courseId">Course ID</param>
  /// <returns>Classroom status including current activity and joined students count</returns>
  [HttpGet("Course/{courseId}/Status")]
  public async Task<IActionResult> GetClassroomStatus(string courseId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var (code, status) = await _classManager.GetClassroomStatusAsync(courseId);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to get classroom status"
        });
      }

      return ReturnOK(status);
    });
  }
}

// ============================================
// Activity Management APIs
// ============================================
public partial class RealTimeClassController
{
  /// <summary>
  /// Create a new activity (Quiz, Poll, or Discussion)
  /// </summary>
  /// <param name="courseId">Course ID</param>
  /// <param name="value">Activity data including type and properties</param>
  /// <returns>Created activity</returns>
  [HttpPost("Course/{courseId}/Activity")]
  public async Task<IActionResult> CreateActivity(string courseId, [FromBody] JsonObject value)
  {
    return await HandleWithResultAsync(async () =>
    {
      if (!value.ContainsKey("type") || !value.ContainsKey("activityData"))
      {
        return ReturnResponse(ServiceRes.BadRequest(ResCode.InvalidActivityType, "Missing 'type' or 'activityData' field"));
      }

      var activityTypeStr = value["type"]!.GetValue<string>();
      if (!Enum.TryParse<ActivityType>(activityTypeStr, true, out var activityType))
      {
        return ReturnResponse(ServiceRes.BadRequest(ResCode.InvalidActivityType, $"Invalid activity type: {activityTypeStr}"));
      }

      var activityData = value["activityData"]!.AsObject();
      var (code, activity) = await _classManager.CreateActivityAsync(courseId, activityType, activityData);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to create activity"
        });
      }

      return ReturnOK(activity);
    });
  }

  /// <summary>
  /// Get a specific activity by ID
  /// </summary>
  /// <param name="activityId">Activity ID</param>
  /// <returns>Activity details</returns>
  [HttpGet("Activity/{activityId}")]
  public async Task<IActionResult> GetActivity(string activityId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var (code, activity) = await _classManager.GetActivityAsync(activityId);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to get activity"
        });
      }

      return ReturnOK(activity);
    });
  }

  /// <summary>
  /// Get all activities for a course
  /// </summary>
  /// <param name="courseId">Course ID</param>
  /// <param name="activeOnly">Filter only active activities (default: false)</param>
  /// <returns>List of activities</returns>
  [HttpGet("Course/{courseId}/Activities")]
  public async Task<IActionResult> GetCourseActivities(string courseId, [FromQuery] bool activeOnly = false)
  {
    return await HandleWithResultAsync(async () =>
    {
      var (code, activities) = await _classManager.GetCourseActivitiesAsync(courseId, activeOnly);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to get activities"
        });
      }

      // Transform activities to include [NotMapped] properties
      var transformedActivities = activities.Select(activity =>
      {
        return activity switch
        {
          Poll poll => (object)new
          {
            poll.Id,
            poll.CourseId,
            poll.Title,
            poll.Description,
            poll.Type,
            poll.ExpiresAt,
            poll.IsActive,
            poll.HasBeenActivated,
            poll.CreatedAt,
            Options = poll.Options, // [NotMapped] property
            AllowMultipleSelections = poll.Poll_AllowMultipleSelections,
            IsAnonymous = poll.Poll_IsAnonymous
          },
          Quiz quiz => (object)new
          {
            quiz.Id,
            quiz.CourseId,
            quiz.Title,
            quiz.Description,
            quiz.Type,
            quiz.ExpiresAt,
            quiz.IsActive,
            quiz.HasBeenActivated,
            quiz.CreatedAt,
            Questions = quiz.Questions, // [NotMapped] property
            TimeLimit = quiz.Quiz_TimeLimit,
            ShowCorrectAnswers = quiz.Quiz_ShowCorrectAnswers,
            StartedAt = quiz.Quiz_StartedAt // When quiz was first activated
          },
          Discussion discussion => (object)new
          {
            discussion.Id,
            discussion.CourseId,
            discussion.Title,
            discussion.Description,
            discussion.Type,
            discussion.ExpiresAt,
            discussion.IsActive,
            discussion.HasBeenActivated,
            discussion.CreatedAt,
            MaxLength = discussion.Discussion_MaxLength,
            AllowAnonymous = discussion.Discussion_AllowAnonymous
          },
          _ => (object)new
          {
            activity.Id,
            activity.CourseId,
            activity.Title,
            activity.Description,
            activity.Type,
            activity.ExpiresAt,
            activity.IsActive,
            activity.HasBeenActivated,
            activity.CreatedAt
          }
        };
      }).ToList();

      return ReturnOK(transformedActivities);
    });
  }

  /// <summary>
  /// Get all quizzes for a course
  /// </summary>
  /// <param name="courseId">Course ID</param>
  /// <returns>List of quizzes</returns>
  [HttpGet("Course/{courseId}/Quizzes")]
  public async Task<IActionResult> GetCourseQuizzes(string courseId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var (code, quizzes) = await _classManager.GetCourseQuizzesAsync(courseId);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to get quizzes"
        });
      }

      return ReturnOK(quizzes);
    });
  }

  /// <summary>
  /// Get all polls for a course
  /// </summary>
  /// <param name="courseId">Course ID</param>
  /// <returns>List of polls</returns>
  [HttpGet("Course/{courseId}/Polls")]
  public async Task<IActionResult> GetCoursePolls(string courseId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var (code, polls) = await _classManager.GetCoursePolls(courseId);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to get polls"
        });
      }

      return ReturnOK(polls);
    });
  }

  /// <summary>
  /// Update an existing activity
  /// </summary>
  /// <param name="activityId">Activity ID</param>
  /// <param name="value">Update data</param>
  /// <returns>Success status</returns>
  [HttpPut("Activity/{activityId}")]
  public async Task<IActionResult> UpdateActivity(string activityId, [FromBody] JsonObject value)
  {
    return await HandleWithResultAsync(async () =>
    {
      var code = await _classManager.UpdateActivityAsync(activityId, value);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to update activity"
        });
      }

      return ReturnOK(new { message = "Activity updated successfully" });
    });
  }

  /// <summary>
  /// Delete an activity (hard delete with cascade)
  /// </summary>
  /// <param name="activityId">Activity ID</param>
  /// <returns>Success status</returns>
  [HttpDelete("Activity/{activityId}")]
  public async Task<IActionResult> DeleteActivity(string activityId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var code = await _classManager.DeleteActivityAsync(activityId);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to delete activity"
        });
      }

      return ReturnOK(new { message = "Activity deleted successfully" });
    });
  }

  /// <summary>
  /// Deactivate an activity (soft delete)
  /// </summary>
  /// <param name="activityId">Activity ID</param>
  /// <returns>Success status</returns>
  [HttpPatch("Activity/{activityId}/Deactivate")]
  public async Task<IActionResult> DeactivateActivity(string activityId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var code = await _classManager.DeactivateActivityAsync(activityId);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to deactivate activity"
        });
      }

      return ReturnOK(new { message = "Activity deactivated successfully" });
    });
  }

  /// <summary>
  /// Get all submissions for an activity
  /// </summary>
  /// <param name="activityId">Activity ID</param>
  /// <returns>List of submissions</returns>
  [HttpGet("Activity/{activityId}/Submissions")]
  public async Task<IActionResult> GetActivitySubmissions(string activityId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var (code, submissions) = await _classManager.GetActivitySubmissionsAsync(activityId);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to get submissions"
        });
      }

      // Convert to DTOs to ensure proper serialization
      var submissionDtos = submissions.Select(s =>
      {
        if (s is PollSubmission pollSub)
        {
          return (object)new
          {
            id = pollSub.Id,
            courseId = pollSub.CourseId,
            studentId = pollSub.StudentId,
            activityId = pollSub.ActivityId,
            submittedAt = pollSub.SubmittedAt,
            type = (int)pollSub.Type,
            selectedOptions = pollSub.SelectedOptions
          };
        }
        else if (s is QuizSubmission quizSub)
        {
          return (object)new
          {
            id = quizSub.Id,
            courseId = quizSub.CourseId,
            studentId = quizSub.StudentId,
            activityId = quizSub.ActivityId,
            submittedAt = quizSub.SubmittedAt,
            type = (int)quizSub.Type,
            answers = quizSub.Answers,
            score = quizSub.Quiz_Score,
            timeSpent = quizSub.Quiz_TimeSpent
          };
        }
        else if (s is DiscussionSubmission discSub)
        {
          return (object)new
          {
            id = discSub.Id,
            courseId = discSub.CourseId,
            studentId = discSub.StudentId,
            activityId = discSub.ActivityId,
            submittedAt = discSub.SubmittedAt,
            type = (int)discSub.Type,
            text = discSub.Discussion_Text,
            isApproved = discSub.Discussion_IsApproved,
            isAnonymous = discSub.Discussion_IsAnonymous
          };
        }
        else
        {
          return (object)new
          {
            id = s.Id,
            courseId = s.CourseId,
            studentId = s.StudentId,
            activityId = s.ActivityId,
            submittedAt = s.SubmittedAt,
            type = (int)s.Type
          };
        }
      }).ToList();

      return ReturnOK(submissionDtos);
    });
  }

  /// <summary>
  /// Get a student's submission for an activity
  /// </summary>
  /// <param name="activityId">Activity ID</param>
  /// <param name="studentId">Student ID</param>
  /// <returns>Submission details</returns>
  [HttpGet("Activity/{activityId}/Student/{studentId}/Submission")]
  public async Task<IActionResult> GetStudentSubmission(string activityId, string studentId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var (code, submission) = await _classManager.GetStudentSubmissionAsync(activityId, studentId);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to get submission"
        });
      }

      // Convert to DTO to ensure proper serialization
      object submissionDto;
      if (submission is PollSubmission pollSub)
      {
        submissionDto = new
        {
          id = pollSub.Id,
          courseId = pollSub.CourseId,
          studentId = pollSub.StudentId,
          activityId = pollSub.ActivityId,
          submittedAt = pollSub.SubmittedAt,
          type = (int)pollSub.Type,
          selectedOptions = pollSub.SelectedOptions
        };
      }
      else if (submission is QuizSubmission quizSub)
      {
        submissionDto = new
        {
          id = quizSub.Id,
          courseId = quizSub.CourseId,
          studentId = quizSub.StudentId,
          activityId = quizSub.ActivityId,
          submittedAt = quizSub.SubmittedAt,
          type = (int)quizSub.Type,
          answers = quizSub.Answers,
          score = quizSub.Quiz_Score,
          timeSpent = quizSub.Quiz_TimeSpent
        };
      }
      else if (submission is DiscussionSubmission discSub)
      {
        submissionDto = new
        {
          id = discSub.Id,
          courseId = discSub.CourseId,
          studentId = discSub.StudentId,
          activityId = discSub.ActivityId,
          submittedAt = discSub.SubmittedAt,
          type = (int)discSub.Type,
          text = discSub.Discussion_Text,
          isApproved = discSub.Discussion_IsApproved,
          isAnonymous = discSub.Discussion_IsAnonymous
        };
      }
      else
      {
        submissionDto = new
        {
          id = submission!.Id,
          courseId = submission.CourseId,
          studentId = submission.StudentId,
          activityId = submission.ActivityId,
          submittedAt = submission.SubmittedAt,
          type = (int)submission.Type
        };
      }

      return ReturnOK(submissionDto);
    });
  }

  /// <summary>
  /// Get all submissions for a quiz with scores
  /// </summary>
  /// <param name="quizId">Quiz ID</param>
  /// <returns>List of quiz submissions ordered by score</returns>
  [HttpGet("Quiz/{quizId}/Submissions")]
  public async Task<IActionResult> GetQuizSubmissions(string quizId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var (code, submissions) = await _classManager.GetQuizSubmissionsAsync(quizId);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to get quiz submissions"
        });
      }

      return ReturnOK(submissions);
    });
  }

  /// <summary>
  /// Submit a quiz answer
  /// </summary>
  /// <param name="quizId">Quiz ID</param>
  /// <param name="value">Submission data (studentId, answers, timeSpent)</param>
  /// <returns>Submission result with score</returns>
  [HttpPost("Quiz/{quizId}/Submit")]
  public async Task<IActionResult> SubmitQuiz(string quizId, [FromBody] JsonObject value)
  {
    return await HandleWithResultAsync(async () =>
    {
      if (!value.ContainsKey("studentId"))
      {
        return ReturnResponse(ServiceRes.BadRequest(ResCode.InvalidSubmissionData, "Missing 'studentId' field"));
      }

      var studentId = value["studentId"]!.GetValue<string>();
      var (code, submission) = await _classManager.SubmitQuizAsync(quizId, studentId, value);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to submit quiz"
        });
      }

      return ReturnOK(submission);
    });
  }

  /// <summary>
  /// Submit a poll vote
  /// </summary>
  /// <param name="pollId">Poll ID</param>
  /// <param name="value">Submission data (studentId, selectedOptions)</param>
  /// <returns>Submission result</returns>
  [HttpPost("Poll/{pollId}/Submit")]
  public async Task<IActionResult> SubmitPoll(string pollId, [FromBody] JsonObject value)
  {
    return await HandleWithResultAsync(async () =>
    {
      if (!value.ContainsKey("studentId"))
      {
        return ReturnResponse(ServiceRes.BadRequest(ResCode.InvalidSubmissionData, "Missing 'studentId' field"));
      }

      var studentId = value["studentId"]!.GetValue<string>();
      var (code, submission) = await _classManager.SubmitPollAsync(pollId, studentId, value);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to submit poll"
        });
      }

      return ReturnOK(submission);
    });
  }

  [HttpPost("Discussion/{discussionId}/Submit")]
  public async Task<IActionResult> SubmitDiscussion(string discussionId, [FromBody] JsonObject value)
  {
    return await HandleWithResultAsync(async () =>
    {
      if (!value.ContainsKey("studentId"))
      {
        return ReturnResponse(ServiceRes.BadRequest(ResCode.InvalidSubmissionData, "Missing 'studentId' field"));
      }

      var studentId = value["studentId"]!.GetValue<string>();
      var (code, submission) = await _classManager.SubmitDiscussionAsync(discussionId, studentId, value);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to submit discussion"
        });
      }

      return ReturnOK(submission);
    });
  }

  /// <summary>
  /// Get activity submissions with student information for instructor view
  /// </summary>
  /// <param name="activityId">Activity ID</param>
  /// <returns>List of submissions with student details</returns>
  [HttpGet("Activity/{activityId}/SubmissionsWithStudents")]
  public async Task<IActionResult> GetActivitySubmissionsWithStudents(string activityId)
  {
    return await HandleWithResultAsync(async () =>
    {
      var (code, enrichedSubmissions) = await _classManager.GetActivitySubmissionsWithStudentsAsync(activityId);

      if (code != ResCode.OK)
      {
        return ReturnResponse(new ServiceRes
        {
          Code = code,
          Message = code.ToDescriptionString() ?? "Failed to get submissions with student information"
        });
      }

      return ReturnOK(enrichedSubmissions);
    });
  }
}
