using System;
using System.Net.WebSockets;
using System.Text.Json.Nodes;

namespace InteractiveHub.Service.ClassManagement;

public interface IClassManager
{
    // Course Management Methods
    Task<ServiceRes> CreateCourseAsync(CreateCourseRequest request);
    Task<ServiceRes> UpdateCourseAsync(UpdateCourseRequest request, string courseId);
    Task<ServiceRes> DeleteCourseAsync(string courseId);
    Task<(ServiceRes, TeachingCourse?)> GetCourseByIdAsync(string courseId);
    Task<(ServiceRes, IEnumerable<TeachingCourse>)> GetAllCoursesAsync();
    Task<(ServiceRes, object?)> GetCourseWithStatsAsync(string courseId);

    // Student Management Methods
    Task<(ServiceRes, IEnumerable<StudentSimpleDto>?)> GetStudentsInCourseAsync(string courseId);
    Task<(ServiceRes, IEnumerable<Student>?)> GetAllStudentsByOwnerAsync();
    Task<ServiceRes> CreateOrUpdateStudentToCourse(IEnumerable<CreateStudentDto> students, string courseId);
    Task<ServiceRes> RemoveStudentsFromCourseAsync(IEnumerable<string> studentIds, string courseId);

    Task<ServiceRes> DeleteStudentAsync(string studentId);

    Task<ServiceRes> DelteStudentsAsync(IEnumerable<string> studentIds);

    // Activity Management Methods
    Task<(ResCode, Activity?)> CreateActivityAsync(string courseId, ActivityType activityType, JsonObject activityData);
    Task<(ResCode, Activity?)> GetActivityAsync(string activityId);
    Task<ResCode> UpdateActivityAsync(string activityId, JsonObject updateData);
    Task<ResCode> DeleteActivityAsync(string activityId);
    Task<ResCode> DeactivateActivityAsync(string activityId);
    Task<(ResCode, List<Activity>)> GetCourseActivitiesAsync(string courseId, bool activeOnly = false);
    Task<(ResCode, List<Quiz>)> GetCourseQuizzesAsync(string courseId);
    Task<(ResCode, List<Poll>)> GetCoursePolls(string courseId);

    // Submission Management Methods
    Task<(ResCode, List<Submission>)> GetActivitySubmissionsAsync(string activityId);
    Task<(ResCode, Submission?)> GetStudentSubmissionAsync(string activityId, string studentId);
    Task<(ResCode, List<QuizSubmission>)> GetQuizSubmissionsAsync(string quizId);
    Task<(ResCode, Submission?)> SubmitQuizAsync(string quizId, string studentId, JsonObject submissionData);
    Task<(ResCode, Submission?)> SubmitPollAsync(string pollId, string studentId, JsonObject submissionData);
    Task<(ResCode, Submission?)> SubmitDiscussionAsync(string discussionId, string studentId, JsonObject submissionData);

    // Real-time Class Methods
    Task HandleNewWebsocketConnection(string token, WebSocket ws);
    Task HandleInstructorWebsocketConnection(string courseId, WebSocket ws);

    Task<(ResCode resCode, JoinClassDto? course)> GetCourseJoinInfo(string joinCodeStr);
    Task<(ResCode, JoinedStudent?)> StudentJoinCourse(string courseId, string studentId, string? studentName, string? email, string? pin);

    (ResCode resCode, JoinedStudent? joinedStudent, JoinClassDto? joinClassDto1) ValidateSessionToken(string token);

    // Get real-time class status (current activity and joined students count)
    Task<(ResCode, object?)> GetClassroomStatusAsync(string courseId);
}

