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
    Task<(ResCode, List<object>)> GetActivitySubmissionsWithStudentsAsync(string activityId);
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

    // AI Assistant Methods
    Task<(ResCode, AIConversation?)> CreateConversationAsync(string courseId, string instructorId, string activityType, string title = "New AI Conversation");
    Task<(ResCode, AIConversationMessage?)> AddMessageAsync(string conversationId, string role, string content, string? pdfContent = null);
    Task<(ResCode, AIConversation?)> GetConversationAsync(string conversationId);
    Task<(ResCode, List<AIConversation>)> GetInstructorConversationsAsync(string instructorId, string? courseId = null, bool includeCompleted = true);
    Task<(ResCode, string, JsonObject?)> GenerateActivityWithAIAsync(string conversationId, string userPrompt, string? pdfContent = null, string? apiKey = null, HttpClient? httpClient = null, string? provider = null, string? model = null);
    Task<(ResCode, AIConversation?)> CompleteConversationAsync(string conversationId, string? generatedActivityId = null);
    Task<ResCode> DeleteConversationAsync(string conversationId);
    Task<(ResCode, AIActivityPreview?)> SaveActivityPreviewAsync(string conversationId, string activityType, string activityDataJson, string? messageId = null);
    Task<ResCode> MarkPreviewAsCreatedAsync(string previewId, string createdActivityId);
    Task<(ResCode, List<AIActivityPreview>)> GetConversationPreviewsAsync(string conversationId);
    Task<(ResCode, AIPdfFile?)> UploadPdfFileAsync(string conversationId, string fileName, long fileSize, string extractedText);
}

