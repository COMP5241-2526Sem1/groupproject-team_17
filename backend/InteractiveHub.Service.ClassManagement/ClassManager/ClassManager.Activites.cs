using System;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;

namespace InteractiveHub.Service.ClassManagement;

public partial class ClassManager
{
  // ============================================
  // Create Activity
  // ============================================
  public async Task<(ResCode, Activity?)> CreateActivityAsync(string courseId, ActivityType activityType, JsonObject activityData)
  {
    try
    {
      // Verify course exists
      var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
      if (course == null)
      {
        return (ResCode.CourseNotFound, null);
      }

      Activity? activity = activityType switch
      {
        ActivityType.Quiz => CreateQuizActivity(courseId, activityData),
        ActivityType.Polling => CreatePollingActivity(courseId, activityData),
        ActivityType.Discussion => CreateDiscussionActivity(courseId, activityData),
        _ => null
      };

      if (activity == null)
      {
        return (ResCode.InvalidActivityType, null);
      }

      await db.Activities.AddAsync(activity);
      await db.SaveChangesAsync();

      // Broadcast to RealtimeClass if active
      await BroadcastActivityEventAsync(courseId, realtimeClass =>
        realtimeClass.BroadcastActivityCreatedAsync(activity)
      );

      _log?.LogInfo($"Activity {activity.Id} created and broadcasted to course {courseId}");
      return (ResCode.OK, activity);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error creating activity: {ex.Message}");
      return (ResCode.DatabaseError, null);
    }
  }

  private Quiz CreateQuizActivity(string courseId, JsonObject data)
  {
    var quiz = new Quiz
    {
      CourseId = courseId,
      Title = data["title"]?.GetValue<string>() ?? "Untitled Quiz",
      Description = data["description"]?.GetValue<string>() ?? "",
      Quiz_TimeLimit = data["timeLimit"]?.GetValue<int>() ?? 300,
      Quiz_ShowCorrectAnswers = data["showCorrectAnswers"]?.GetValue<bool>() ?? false,
      Quiz_ShuffleQuestions = data["shuffleQuestions"]?.GetValue<bool>() ?? false
    };

    if (data["questions"] is JsonArray questionsArray)
    {
      var questions = new List<QuizQuestion>();
      foreach (var q in questionsArray)
      {
        if (q is JsonObject questionObj)
        {
          var options = new List<string>();
          if (questionObj["options"] is JsonArray optionsArray)
          {
            foreach (var opt in optionsArray)
            {
              options.Add(opt?.GetValue<string>() ?? "");
            }
          }

          questions.Add(new QuizQuestion
          {
            Text = questionObj["text"]?.GetValue<string>() ?? "",
            Options = options,
            CorrectAnswer = questionObj["correctAnswer"]?.GetValue<int>() ?? 0,
            Points = questionObj["points"]?.GetValue<int>() ?? 1,
            Explanation = questionObj["explanation"]?.GetValue<string>()
          });
        }
      }
      quiz.Questions = questions;
    }

    return quiz;
  }

  private Poll CreatePollingActivity(string courseId, JsonObject data)
  {
    var poll = new Poll
    {
      CourseId = courseId,
      Title = data["title"]?.GetValue<string>() ?? "Untitled Poll",
      Description = data["description"]?.GetValue<string>() ?? "",
      Poll_AllowMultipleSelections = data["allowMultipleSelections"]?.GetValue<bool>() ?? false,
      Poll_IsAnonymous = data["isAnonymous"]?.GetValue<bool>() ?? true
    };

    if (data["options"] is JsonArray optionsArray)
    {
      var options = new List<PollOption>();
      foreach (var opt in optionsArray)
      {
        if (opt is JsonObject optionObj)
        {
          options.Add(new PollOption
          {
            Text = optionObj["text"]?.GetValue<string>() ?? "",
            ImageUrl = optionObj["imageUrl"]?.GetValue<string>()
          });
        }
      }
      poll.Options = options;
    }

    return poll;
  }

  private Discussion CreateDiscussionActivity(string courseId, JsonObject data)
  {
    return new Discussion
    {
      CourseId = courseId,
      Title = data["title"]?.GetValue<string>() ?? "Untitled Discussion",
      Description = data["description"]?.GetValue<string>() ?? "",
      Discussion_MaxLength = data["maxLength"]?.GetValue<int>() ?? 500,
      Discussion_AllowAnonymous = data["allowAnonymous"]?.GetValue<bool>() ?? false,
      Discussion_RequireApproval = data["requireApproval"]?.GetValue<bool>() ?? false
    };
  }

  // ============================================
  // Get Activities
  // ============================================
  public async Task<(ResCode, Activity?)> GetActivityAsync(string activityId)
  {
    try
    {
      var activity = await db.Activities.FirstOrDefaultAsync(a => a.Id == activityId);

      if (activity == null)
      {
        return (ResCode.ActivityNotFound, null);
      }

      return (ResCode.OK, activity);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error getting activity: {ex.Message}");
      return (ResCode.DatabaseError, null);
    }
  }

  // ============================================
  // Update Activity
  // ============================================
  public async Task<ResCode> UpdateActivityAsync(string activityId, JsonObject updateData)
  {
    try
    {
      var activity = await db.Activities.FirstOrDefaultAsync(a => a.Id == activityId);

      if (activity == null)
      {
        return ResCode.ActivityNotFound;
      }

      var courseId = activity.CourseId;

      // Update common properties
      if (updateData.ContainsKey("title"))
      {
        activity.Title = updateData["title"]?.GetValue<string>() ?? activity.Title;
      }

      if (updateData.ContainsKey("description"))
      {
        activity.Description = updateData["description"]?.GetValue<string>() ?? activity.Description;
      }

      if (updateData.ContainsKey("isActive"))
      {
        var newIsActive = updateData["isActive"]?.GetValue<bool>() ?? activity.IsActive;
        var wasActive = activity.IsActive;

        // If setting this activity to active, deactivate all other activities for this course
        // This ensures only one activity can be active at a time
        List<Activity> otherActiveActivities = new();
        if (newIsActive && !activity.IsActive)
        {
          otherActiveActivities = await db.Activities
            .Where(a => a.CourseId == courseId && a.IsActive && a.Id != activityId)
            .ToListAsync();

          foreach (var otherActivity in otherActiveActivities)
          {
            otherActivity.IsActive = false;
            _log?.LogInfo($"Auto-deactivating activity {otherActivity.Id} because activity {activityId} is being activated");
          }

          // Mark this activity as having been activated at least once
          activity.HasBeenActivated = true;
        }

        // If deactivating this activity, mark it for deactivation broadcast
        if (!newIsActive && wasActive)
        {
          updateData["_thisActivityDeactivated"] = JsonSerializer.SerializeToNode(true);
        }

        activity.IsActive = newIsActive;

        // Store the list with hasBeenActivated info for later broadcasting after SaveChanges
        updateData["_otherActiveActivities"] = JsonSerializer.SerializeToNode(
          otherActiveActivities.Select(a => new { id = a.Id, hasBeenActivated = a.HasBeenActivated }).ToList()
        );
      }

      if (updateData.ContainsKey("expiresAt") && updateData["expiresAt"] != null)
      {
        activity.ExpiresAt = updateData["expiresAt"]?.GetValue<DateTime>();
      }

      // Update type-specific properties
      switch (activity)
      {
        case Quiz quiz:
          UpdateQuizProperties(quiz, updateData);
          break;
        case Poll poll:
          UpdatePollProperties(poll, updateData);
          break;
        case Discussion discussion:
          UpdateDiscussionProperties(discussion, updateData);
          break;
      }

      await db.SaveChangesAsync();

      // NOW broadcast all changes AFTER database is updated
      // First broadcast deactivations if any (from auto-deactivation of other activities)
      if (updateData.ContainsKey("_otherActiveActivities"))
      {
        var deactivatedActivities = JsonSerializer.Deserialize<List<dynamic>>(updateData["_otherActiveActivities"]!.ToJsonString());
        if (deactivatedActivities != null)
        {
          foreach (var deactivated in deactivatedActivities)
          {
            var deactivatedId = deactivated.GetProperty("id").GetString();
            var hasBeenActivated = deactivated.GetProperty("hasBeenActivated").GetBoolean();

            await BroadcastActivityEventAsync(courseId, realtimeClass =>
              realtimeClass.BroadcastActivityDeactivatedAsync(deactivatedId!, hasBeenActivated)
            );
          }
        }
      }

      // If this activity itself was deactivated, broadcast it
      if (updateData.ContainsKey("_thisActivityDeactivated") && updateData["_thisActivityDeactivated"]?.GetValue<bool>() == true)
      {
        await BroadcastActivityEventAsync(courseId, realtimeClass =>
          realtimeClass.BroadcastActivityDeactivatedAsync(activityId, activity.HasBeenActivated)
        );
      }
      else
      {
        // Otherwise broadcast the update
        await BroadcastActivityEventAsync(courseId, realtimeClass =>
          realtimeClass.BroadcastActivityUpdatedAsync(activity)
        );
      }

      _log?.LogInfo($"Activity {activityId} updated and broadcasted");
      return ResCode.OK;
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error updating activity: {ex.Message}");
      return ResCode.DatabaseError;
    }
  }

  private void UpdateQuizProperties(Quiz quiz, JsonObject data)
  {
    if (data.ContainsKey("timeLimit"))
    {
      quiz.Quiz_TimeLimit = data["timeLimit"]?.GetValue<int>() ?? quiz.Quiz_TimeLimit;
    }

    if (data.ContainsKey("showCorrectAnswers"))
    {
      quiz.Quiz_ShowCorrectAnswers = data["showCorrectAnswers"]?.GetValue<bool>() ?? quiz.Quiz_ShowCorrectAnswers;
    }

    if (data.ContainsKey("shuffleQuestions"))
    {
      quiz.Quiz_ShuffleQuestions = data["shuffleQuestions"]?.GetValue<bool>() ?? quiz.Quiz_ShuffleQuestions;
    }

    // Update questions if provided
    if (data["questions"] is JsonArray questionsArray)
    {
      var questions = new List<QuizQuestion>();
      foreach (var q in questionsArray)
      {
        if (q is JsonObject questionObj)
        {
          var options = new List<string>();
          if (questionObj["options"] is JsonArray optionsArray)
          {
            foreach (var opt in optionsArray)
            {
              options.Add(opt?.GetValue<string>() ?? "");
            }
          }

          questions.Add(new QuizQuestion
          {
            Text = questionObj["text"]?.GetValue<string>() ?? "",
            Options = options,
            CorrectAnswer = questionObj["correctAnswer"]?.GetValue<int>() ?? 0,
            Points = questionObj["points"]?.GetValue<int>() ?? 1,
            Explanation = questionObj["explanation"]?.GetValue<string>()
          });
        }
      }
      quiz.Questions = questions;
    }
  }

  private void UpdatePollProperties(Poll poll, JsonObject data)
  {
    if (data.ContainsKey("allowMultipleSelections"))
    {
      poll.Poll_AllowMultipleSelections = data["allowMultipleSelections"]?.GetValue<bool>() ?? poll.Poll_AllowMultipleSelections;
    }

    if (data.ContainsKey("isAnonymous"))
    {
      poll.Poll_IsAnonymous = data["isAnonymous"]?.GetValue<bool>() ?? poll.Poll_IsAnonymous;
    }

    // Update options if provided
    if (data["options"] is JsonArray optionsArray)
    {
      var options = new List<PollOption>();
      foreach (var opt in optionsArray)
      {
        if (opt is JsonObject optionObj)
        {
          options.Add(new PollOption
          {
            Text = optionObj["text"]?.GetValue<string>() ?? "",
            ImageUrl = optionObj["imageUrl"]?.GetValue<string>()
          });
        }
      }
      poll.Options = options;
    }
  }

  private void UpdateDiscussionProperties(Discussion discussion, JsonObject data)
  {
    if (data.ContainsKey("maxLength"))
    {
      discussion.Discussion_MaxLength = data["maxLength"]?.GetValue<int>() ?? discussion.Discussion_MaxLength;
    }

    if (data.ContainsKey("allowAnonymous"))
    {
      discussion.Discussion_AllowAnonymous = data["allowAnonymous"]?.GetValue<bool>() ?? discussion.Discussion_AllowAnonymous;
    }

    if (data.ContainsKey("requireApproval"))
    {
      discussion.Discussion_RequireApproval = data["requireApproval"]?.GetValue<bool>() ?? discussion.Discussion_RequireApproval;
    }
  }

  // ============================================
  // Delete Activity (with Cascade Delete for Submissions)
  // ============================================
  public async Task<ResCode> DeleteActivityAsync(string activityId)
  {
    try
    {
      var activity = await db.Activities.FirstOrDefaultAsync(a => a.Id == activityId);

      if (activity == null)
      {
        return ResCode.ActivityNotFound;
      }

      var courseId = activity.CourseId;

      // With Cascade Delete configured in DbContext, this will automatically delete all related submissions
      db.Activities.Remove(activity);
      await db.SaveChangesAsync();

      // Broadcast deletion to RealtimeClass
      await BroadcastActivityEventAsync(courseId, realtimeClass =>
        realtimeClass.BroadcastActivityDeletedAsync(activityId)
      );

      _log?.LogInfo($"Activity {activityId} deleted with all related submissions and broadcasted");
      return ResCode.OK;
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error deleting activity: {ex.Message}");
      return ResCode.DatabaseError;
    }
  }

  // Alternative: Soft delete (recommended for production)
  public async Task<ResCode> DeactivateActivityAsync(string activityId)
  {
    try
    {
      var activity = await db.Activities.FirstOrDefaultAsync(a => a.Id == activityId);

      if (activity == null)
      {
        return ResCode.ActivityNotFound;
      }

      var courseId = activity.CourseId;

      // Soft delete: just mark as inactive instead of deleting
      activity.IsActive = false;
      await db.SaveChangesAsync();

      // Broadcast deactivation to RealtimeClass
      await BroadcastActivityEventAsync(courseId, realtimeClass =>
        realtimeClass.BroadcastActivityDeactivatedAsync(activityId, activity.HasBeenActivated)
      );

      _log?.LogInfo($"Activity {activityId} deactivated and broadcasted");
      return ResCode.OK;
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error deactivating activity: {ex.Message}");
      return ResCode.DatabaseError;
    }
  }

  public async Task<(ResCode, List<Activity>)> GetCourseActivitiesAsync(string courseId, bool activeOnly = false)
  {
    try
    {
      var query = db.Activities.Where(a => a.CourseId == courseId);

      if (activeOnly)
      {
        query = query.Where(a => a.IsActive);
      }

      var activities = await query
        .OrderByDescending(a => a.CreatedAt)
        .ToListAsync();

      return (ResCode.OK, activities);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error getting course activities: {ex.Message}");
      return (ResCode.DatabaseError, new List<Activity>());
    }
  }

  public async Task<(ResCode, List<Quiz>)> GetCourseQuizzesAsync(string courseId)
  {
    try
    {
      var quizzes = await db.Activities
        .OfType<Quiz>()
        .Where(q => q.CourseId == courseId)
        .OrderByDescending(q => q.CreatedAt)
        .ToListAsync();

      return (ResCode.OK, quizzes);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error getting quizzes: {ex.Message}");
      return (ResCode.DatabaseError, new List<Quiz>());
    }
  }

  public async Task<(ResCode, List<Poll>)> GetCoursePolls(string courseId)
  {
    try
    {
      var polls = await db.Activities
        .OfType<Poll>()
        .Where(p => p.CourseId == courseId)
        .OrderByDescending(p => p.CreatedAt)
        .ToListAsync();

      return (ResCode.OK, polls);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error getting polls: {ex.Message}");
      return (ResCode.DatabaseError, new List<Poll>());
    }
  }

  // ============================================
  // Get Submissions
  // ============================================
  public async Task<(ResCode, List<Submission>)> GetActivitySubmissionsAsync(string activityId)
  {
    try
    {
      var submissions = await db.Submissions
        .Where(s => s.ActivityId == activityId)
        .OrderBy(s => s.SubmittedAt)
        .ToListAsync();

      return (ResCode.OK, submissions);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error getting submissions: {ex.Message}");
      return (ResCode.DatabaseError, new List<Submission>());
    }
  }

  public async Task<(ResCode, Submission?)> GetStudentSubmissionAsync(string activityId, string studentId)
  {
    try
    {
      var submission = await db.Submissions
        .FirstOrDefaultAsync(s => s.ActivityId == activityId && s.StudentId == studentId);

      if (submission == null)
      {
        return (ResCode.SubmissionNotFound, null);
      }

      return (ResCode.OK, submission);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error getting student submission: {ex.Message}");
      return (ResCode.DatabaseError, null);
    }
  }

  public async Task<(ResCode, List<QuizSubmission>)> GetQuizSubmissionsAsync(string quizId)
  {
    try
    {
      var submissions = await db.Submissions
        .OfType<QuizSubmission>()
        .Where(s => s.ActivityId == quizId)
        .OrderByDescending(s => s.Quiz_Score)
        .ToListAsync();

      return (ResCode.OK, submissions);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error getting quiz submissions: {ex.Message}");
      return (ResCode.DatabaseError, new List<QuizSubmission>());
    }
  }

  // ============================================
  // Submit Responses
  // ============================================
  public async Task<(ResCode, Submission?)> SubmitQuizAsync(string quizId, string studentId, JsonObject submissionData)
  {
    try
    {
      // Check if quiz exists and is active
      var quiz = await db.Activities.OfType<Quiz>().FirstOrDefaultAsync(q => q.Id == quizId);
      if (quiz == null)
      {
        return (ResCode.ActivityNotFound, null);
      }

      if (!quiz.IsActive)
      {
        return (ResCode.ActivityExpired, null);
      }

      // Check if already submitted
      var existing = await db.Submissions
        .FirstOrDefaultAsync(s => s.ActivityId == quizId && s.StudentId == studentId);

      if (existing != null)
      {
        return (ResCode.AlreadySubmitted, null);
      }

      // Parse answers
      var answers = new List<int>();
      if (submissionData["answers"] is JsonArray answersArray)
      {
        foreach (var ans in answersArray)
        {
          answers.Add(ans?.GetValue<int>() ?? -1);
        }
      }

      // Calculate score
      double score = CalculateQuizScore(quiz, answers);

      var submission = new QuizSubmission
      {
        CourseId = quiz.CourseId,
        ActivityId = quizId,
        StudentId = studentId,
        Answers = answers,
        Quiz_Score = score,
        Quiz_TimeSpent = submissionData["timeSpent"]?.GetValue<int>() ?? 0
      };

      await db.Submissions.AddAsync(submission);
      await db.SaveChangesAsync();

      // Broadcast new submission to RealtimeClass
      await BroadcastActivityEventAsync(quiz.CourseId, realtimeClass =>
        realtimeClass.BroadcastNewSubmissionAsync(quizId, studentId, ActivityType.Quiz)
      );

      return (ResCode.OK, submission);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error submitting quiz: {ex.Message}");
      return (ResCode.DatabaseError, null);
    }
  }

  public async Task<(ResCode, Submission?)> SubmitPollAsync(string pollId, string studentId, JsonObject submissionData)
  {
    try
    {
      var poll = await db.Activities.OfType<Poll>().FirstOrDefaultAsync(p => p.Id == pollId);
      if (poll == null)
      {
        return (ResCode.ActivityNotFound, null);
      }

      if (!poll.IsActive)
      {
        return (ResCode.ActivityExpired, null);
      }

      // Check if already submitted
      var existing = await db.Submissions
        .FirstOrDefaultAsync(s => s.ActivityId == pollId && s.StudentId == studentId);

      if (existing != null)
      {
        return (ResCode.AlreadySubmitted, null);
      }

      // Parse selected options
      var selectedOptions = new List<int>();
      if (submissionData["selectedOptions"] is JsonArray optionsArray)
      {
        foreach (var opt in optionsArray)
        {
          selectedOptions.Add(opt?.GetValue<int>() ?? -1);
        }
      }

      var submission = new PollSubmission
      {
        CourseId = poll.CourseId,
        ActivityId = pollId,
        StudentId = studentId,
        SelectedOptions = selectedOptions
      };

      await db.Submissions.AddAsync(submission);
      await db.SaveChangesAsync();

      // Broadcast new submission to RealtimeClass
      await BroadcastActivityEventAsync(poll.CourseId, realtimeClass =>
        realtimeClass.BroadcastNewSubmissionAsync(pollId, studentId, ActivityType.Polling)
      );

      return (ResCode.OK, submission);
    }
    catch (Exception ex)
    {
      _log?.LogError($"Error submitting poll: {ex.Message}");
      return (ResCode.DatabaseError, null);
    }
  }

  // ============================================
  // Helper Methods
  // ============================================
  private double CalculateQuizScore(Quiz quiz, List<int> answers)
  {
    int correctCount = 0;
    int totalPoints = 0;

    for (int i = 0; i < quiz.Questions.Count; i++)
    {
      totalPoints += quiz.Questions[i].Points;
      if (i < answers.Count && answers[i] == quiz.Questions[i].CorrectAnswer)
      {
        correctCount += quiz.Questions[i].Points;
      }
    }

    return totalPoints > 0 ? (correctCount * 100.0 / totalPoints) : 0;
  }

  // Helper method to broadcast activity events to RealtimeClass
  private async Task BroadcastActivityEventAsync(string courseId, Func<RealtimeClass, Task> broadcastAction)
  {
    if (ActiveClasses.TryGetValue(courseId, out var realtimeClass))
    {
      try
      {
        await broadcastAction(realtimeClass);
      }
      catch (Exception ex)
      {
        _log?.LogError($"Error broadcasting activity event to course {courseId}: {ex.Message}");
      }
    }
  }
}
