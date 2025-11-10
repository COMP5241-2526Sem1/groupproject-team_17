using System;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using InteractiveHub.Service.ClassManagement.Repository;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace InteractiveHub.Service.ClassManagement;

public partial class ClassManager
{
  public static ConcurrentDictionary<string, RealtimeClass> ActiveClasses = new(); // Key: CourseId, Value: RealtimeClass instance

  public async Task HandleNewWebsocketConnection(string token, WebSocket ws)
  {
    // Get JoinedStudent and JoinClassDto from token
    var courseId = GetCourseIdFromToken(token);
    if (ActiveClasses.TryGetValue(courseId, out var realtimeClass) == false)
    {
      await CloseWithError(ws, "FORCE_RELOGIN");
      return;
    }
    await realtimeClass.HandleWebsocket(token, ws);
  }

  public async Task HandleInstructorWebsocketConnection(string courseId, WebSocket ws)
  {

    // Ensure RealtimeClass exists for this course
    if (!ActiveClasses.TryGetValue(courseId, out var realtimeClass))
    {
      // Try to load course from database
      var course = await db.Courses.Include(c => c.Students).Where(c => c.Id == courseId).FirstOrDefaultAsync();
      if (course == null)
      {
        await CloseWithError(ws, "COURSE_NOT_FOUND");
        return;
      }

      // Create RealtimeClass and add to ActiveClasses
      realtimeClass = RealtimeClass.Create(course);
      ActiveClasses.TryAdd(courseId, realtimeClass);
    }

    // Handle instructor WebSocket connection
    await realtimeClass.HandleInstructorWebsocket(ws);
  }

  private async Task CloseWithError(WebSocket webSocket, string reason)
  {
    try
    {
      if (webSocket.State == WebSocketState.Open)
      {
        // Send error message
        var errorMessage = System.Text.Encoding.UTF8.GetBytes(
            $"{{\"type\":\"error\",\"message\":\"{reason}\"}}"
        );
        await webSocket.SendAsync(
            new ArraySegment<byte>(errorMessage),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );

        // Close connection
        await webSocket.CloseAsync(
            WebSocketCloseStatus.PolicyViolation,
            reason,
            CancellationToken.None
        );
      }
    }
    catch (Exception ex)
    {
      Console.WriteLine($"Error closing WebSocket: {ex.Message}");
    }
  }

  public async Task<(ResCode resCode, JoinClassDto? course)> GetCourseJoinInfo(string joinCodeStr)
  {
    // Get the course by join code
    if (long.TryParse(joinCodeStr, out long joinCode) == false)
    {
      // Invalid join code format
      return (ResCode.CourseNotFound, null);
    }
    var course = await db.Courses.Where(c => c.JoinCode == joinCode).FirstOrDefaultAsync();
    var joinClassDto = course?.ToJoinClassDto();
    if (joinClassDto == null)
    {
      return (ResCode.CourseNotFound, null);
    }

    return (ResCode.OK, joinClassDto);
  }
  public async Task<(ResCode, JoinedStudent?)> StudentJoinCourse(string courseId, string studentId, string? studentName, string? email, string? pin)
  {
    // First, try to get existing RealtimeClass to avoid DB query
    if (ActiveClasses.TryGetValue(courseId, out var existingRealtimeClass))
    {
      // Use cached course data if available
      if (existingRealtimeClass.Course != null)
      {
        var res0 = await VerifyAndJoinStudent(existingRealtimeClass.Course, studentId, studentName, email, pin);

        if (res0.Item1 == ResCode.OK)
        {
          existingRealtimeClass.AddStudent(res0.Item2!);
        }


        return res0;
      }
    }

    // Course not in active classes or Course data not cached, need to fetch from DB
    var courseFromDb = await db.Courses.Include(c => c.Students).Where(c => c.Id == courseId).FirstOrDefaultAsync();

    if (courseFromDb == null)
    {
      return (ResCode.CourseNotFound, null);
    }

    // Create RealtimeClass and add to ActiveClasses
    EnsureRealtimeClassExists(courseId, courseFromDb);

    // Verify and join student
    var res = await VerifyAndJoinStudent(courseFromDb, studentId, studentName, email, pin);
    if (res.Item1 == ResCode.OK)
    {
      var realtimeClass = ActiveClasses[courseId];
      realtimeClass.AddStudent(res.Item2!);
    }
    return res;
  }
  private async Task<TeachingCourse?> GetCachedCourse(string courseId, string OwnerId)
  {
    if (ActiveClasses.TryGetValue(courseId, out var existingRealtimeClass))
    {
      if (existingRealtimeClass.Course != null && existingRealtimeClass.Course.OwnerId == OwnerId)
      {
        return existingRealtimeClass.Course;
      }
      return null;
    }
    else
    {
      // Get from DB as fallback
      var courseFromDb = await db.Courses.Include(c => c.Students).Where(c
          => c.Id == courseId && c.OwnerId == OwnerId).FirstOrDefaultAsync();
      return courseFromDb;
    }
  }

  // Extracted verification logic to avoid duplication
  private async Task<(ResCode, JoinedStudent?)> VerifyAndJoinStudent(
    TeachingCourse course,
    string studentId,
    string? studentName,
    string? email,
    string? pin)
  {
    // Check if student already in course

    var existingStudent = await db.Students
      .Where(s => s.StudentId == studentId && s.OwnerId == course.OwnerId)
      .FirstOrDefaultAsync();
    if (existingStudent == null)
    {
      // check if course dont need the verification
      if (course.JoinCheckingModes != null &&
          course.JoinCheckingModes.Length == 1 &&
          course.JoinCheckingModes[0] == TeachingCourse.JoinCheckingModeEnum.Disabled)
      {
        // Add new student to course
        if (string.IsNullOrWhiteSpace(studentId))
        {
          return (ResCode.UnauthorizedStudent, null);
        }

        // Create new student record
        var newStudent = new Student
        {
          StudentId = studentId,
          FullName = studentName ?? $"Guest_{Guid.NewGuid().ToString().Substring(0, 8)}",
          Email = email ?? string.Empty,
          PIN = pin ?? string.Empty,
          OwnerId = course.OwnerId,
        };

        // Get the course from DB context to ensure it's tracked properly
        var trackedCourse = await db.Courses
          .Where(c => c.Id == course.Id)
          .FirstOrDefaultAsync();

        if (trackedCourse != null)
        {
          // Add student to course through tracked entity
          newStudent.Courses.Add(trackedCourse);
        }

        db.Students.Add(newStudent);
        await db.SaveChangesAsync();

        var joinedStudent = new JoinedStudent
        {
          StudentId = newStudent.StudentId,
          StudentName = newStudent.FullName,
          Token = GenerateSessionToken(course.Id, newStudent.Id, newStudent.StudentId)
        };

        return (ResCode.OK, joinedStudent);
      }
      else
      {
        return (ResCode.UnauthorizedStudent, null);
      }
    }
    // Verify student credentials against course's JoinCheckingModes
    var joinModes = course.JoinCheckingModes ?? new[] { TeachingCourse.JoinCheckingModeEnum.Disabled };

    // Check if student's provided information matches ANY of the allowed combinations
    bool isVerified = false;
    foreach (var mode in joinModes)
    {
      // Skip if mode is Disabled
      if (mode == TeachingCourse.JoinCheckingModeEnum.Disabled)
      {
        continue;
      }

      bool combinationMatches = true;

      // Check Student ID (always required when mode > 0)
      if (mode.HasFlag(TeachingCourse.JoinCheckingModeEnum.StudentId))
      {
        if (existingStudent.StudentId != studentId)
        {
          combinationMatches = false;
        }
      }

      // Check Student Name
      if (mode.HasFlag(TeachingCourse.JoinCheckingModeEnum.StudentName) && combinationMatches)
      {
        if (string.IsNullOrWhiteSpace(studentName) ||
            !existingStudent.FullName.Equals(studentName, StringComparison.OrdinalIgnoreCase))
        {
          combinationMatches = false;
        }
      }

      // Check Email
      if (mode.HasFlag(TeachingCourse.JoinCheckingModeEnum.Email) && combinationMatches)
      {
        if (string.IsNullOrWhiteSpace(email) ||
            !existingStudent.Email.Equals(email, StringComparison.OrdinalIgnoreCase))
        {
          combinationMatches = false;
        }
      }

      // Check PIN
      if (mode.HasFlag(TeachingCourse.JoinCheckingModeEnum.PIN) && combinationMatches)
      {
        if (string.IsNullOrWhiteSpace(pin) || existingStudent.PIN != pin)
        {
          combinationMatches = false;
        }
      }

      // If this combination matches all required fields, student is verified
      if (combinationMatches)
      {
        isVerified = true;
        break;
      }
    }

    if (!isVerified)
    {
      return (ResCode.UnauthorizedStudent, null);
    }

    // Generate session token for the student to join the course
    var sessionToken = GenerateSessionToken(course.Id, existingStudent.Id, existingStudent.StudentId);

    return (ResCode.OK, new JoinedStudent
    {
      CourseId = course.Id,
      StudentId = existingStudent.StudentId,
      StudentName = existingStudent.FullName,
      Token = sessionToken
    });
  }


  // Helper method to ensure RealtimeClass exists in ActiveClasses
  private void EnsureRealtimeClassExists(string courseId, TeachingCourse course)
  {
    // Use GetOrAdd to atomically check and add if not exists
    // This prevents multiple threads from creating duplicate RealtimeClass instances
    ActiveClasses.GetOrAdd(courseId, _ => RealtimeClass.Create(course));
  }

  // Generate a secure session token for student classroom access
  private string GenerateSessionToken(string courseId, string studentDbId, string studentId)
  {
    // Create a payload with course info, student info, and expiration
    var expirationTime = DateTimeOffset.UtcNow.AddHours(24).ToUnixTimeSeconds();
    var payload = $"{courseId}:{studentDbId}:{studentId}:{expirationTime}";

    // Create a signature using HMAC-SHA256
    // In production, use a secure secret key from configuration
    var secretKey = "YourSecureSecretKey_ShouldBeInConfiguration_MinimumLength32Characters!";
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
    var payloadBytes = Encoding.UTF8.GetBytes(payload);
    var signatureBytes = hmac.ComputeHash(payloadBytes);
    var signature = Convert.ToBase64String(signatureBytes);

    // Combine payload and signature
    var token = $"{Convert.ToBase64String(payloadBytes)}.{signature}";

    return token;
  }

  // Validate and decode session token
  public (ResCode resCode, JoinedStudent? joinedStudent, JoinClassDto? joinClassDto1) ValidateSessionToken(string token)
  {
    var student = new JoinedStudent();
    var joinClassDto = new JoinClassDto();
    try
    {
      var parts = token.Split('.');
      if (parts.Length != 2)
      {
        return (ResCode.InvalidJoinToken, null, null);
      }

      var payloadBase64 = parts[0];
      var signatureBase64 = parts[1];

      // Verify signature
      var secretKey = "YourSecureSecretKey_ShouldBeInConfiguration_MinimumLength32Characters!";
      using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
      var payloadBytes = Convert.FromBase64String(payloadBase64);
      var expectedSignatureBytes = hmac.ComputeHash(payloadBytes);
      var expectedSignature = Convert.ToBase64String(expectedSignatureBytes);

      if (signatureBase64 != expectedSignature)
      {
        return (ResCode.InvalidJoinToken, null, null);
      }

      // Decode payload
      var payload = Encoding.UTF8.GetString(payloadBytes);
      var payloadParts = payload.Split(':');

      if (payloadParts.Length != 4)
      {
        return (ResCode.InvalidJoinToken, null, null);
      }

      var courseId = payloadParts[0];
      if (ActiveClasses.TryGetValue(courseId, out var realtimeClass) == false)
      {
        return (ResCode.InvalidJoinToken, null, null);
      }
      student = realtimeClass.ActiveStudents.Values.FirstOrDefault(s => s.StudentId == payloadParts[2]);
      joinClassDto = realtimeClass.Course?.ToJoinClassDto();

      return (ResCode.OK, student, joinClassDto);

    }
    catch
    {
      return (ResCode.InvalidJoinToken, null, null);
    }
  }
  private string GetCourseIdFromToken(string token)
  {
    try
    {
      var parts = token.Split('.');
      if (parts.Length != 2)
      {
        return string.Empty;
      }

      var payloadBase64 = parts[0];

      // Decode payload
      var payloadBytes = Convert.FromBase64String(payloadBase64);
      var payload = Encoding.UTF8.GetString(payloadBytes);
      var payloadParts = payload.Split(':');

      if (payloadParts.Length != 4)
      {
        return string.Empty;
      }

      var courseId = payloadParts[0];
      return courseId;
    }
    catch
    {
      return string.Empty;
    }
  }

  // Get real-time classroom status (current activity and joined students count)
  public async Task<(ResCode, object?)> GetClassroomStatusAsync(string courseId)
  {
    try
    {
      // Check if RealtimeClass exists for this course
      if (!ActiveClasses.TryGetValue(courseId, out var realtimeClass))
      {
        // Course is not active, no students joined yet
        // Try to get the active activity from database
        var activeActivity = await db.Activities
          .Where(a => a.CourseId == courseId && a.IsActive)
          .OrderByDescending(a => a.CreatedAt)
          .FirstOrDefaultAsync();

        var activityData = SerializeActivityWithOptions(activeActivity);

        return (ResCode.OK, new
        {
          joinedStudentsCount = 0,
          currentActivity = activityData,
          isClassroomActive = false
        });
      }

      // Get the current active activity
      var currentActivity = await db.Activities
        .Where(a => a.CourseId == courseId && a.IsActive)
        .OrderByDescending(a => a.CreatedAt)
        .FirstOrDefaultAsync();

      var currentActivityData = SerializeActivityWithOptions(currentActivity);

      // Count students with active WebSocket connections (ws != null and state == Open)
      var onlineStudentsCount = realtimeClass.ActiveStudents.Values
        .Count(student => student.webSocket != null && student.webSocket.State == WebSocketState.Open);

      var response = new
      {
        joinedStudentsCount = onlineStudentsCount,
        currentActivity = currentActivityData,
        isClassroomActive = true
      };

      return (ResCode.OK, response);
    }
    catch (Exception ex)
    {
      Console.WriteLine($"Error getting classroom status: {ex.Message}");
      return (ResCode.InternalError, null);
    }
  }

  private object? SerializeActivityWithOptions(Activity? activity)
  {
    if (activity == null) return null;

    return activity switch
    {
      Poll poll => new
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
        options = poll.Options, // This will use the [NotMapped] property getter
        poll.Poll_AllowMultipleSelections,
        poll.Poll_IsAnonymous
      },
      Quiz quiz => new
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
        questions = quiz.Questions, // This will use the [NotMapped] property getter
        quiz.Quiz_TimeLimit,
        quiz.Quiz_ShowCorrectAnswers,
        quiz.Quiz_StartedAt // UTC timestamp when quiz was first activated
      },
      Discussion discussion => new
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
        discussion.Discussion_MaxLength,
        discussion.Discussion_AllowAnonymous
      },
      _ => new
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
  }
}
