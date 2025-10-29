using System;
using System.Collections.Concurrent;
using System.Net.WebSockets;

namespace InteractiveHub.Service.ClassManagement;



public struct WsMessage<T>
{

    public int code { get; set; } = 0;
    public string Type { get; set; } = string.Empty;
    public T? Payload { get; set; }
    public WsMessage()
    {

    }
}

public class RealtimeClass : IHObject
{
    public string CourseId { get; set; } = string.Empty;
    public ConcurrentDictionary<string, JoinedStudent> ActiveStudents = new();
    public ConcurrentBag<WebSocket> InstructorWebSockets = new();
    public TeachingCourse? Course { get; set; }
    public RealtimeClass() : base()
    {
        // Extract short id from guid
        var guid = Guid.NewGuid().ToString("N");
        Id = $"cls.{guid.Substring(0, 12)}";
    }

    public async Task BroadcastAsync(string message)
    {
        var messageBytes = System.Text.Encoding.UTF8.GetBytes(message);
        var tasks = new List<Task>();

        // Broadcast to students
        var studentsWebsockets = ActiveStudents.Values.Select(s => s.webSocket).ToList();
        foreach (var webSocket in studentsWebsockets)
        {
            if (webSocket != null && webSocket.State == WebSocketState.Open)
            {
                tasks.Add(webSocket.SendAsync(
                    new ArraySegment<byte>(messageBytes),
                    WebSocketMessageType.Text,
                    true,
                    CancellationToken.None
                ));
            }
        }

        // Broadcast to instructors
        foreach (var webSocket in InstructorWebSockets)
        {
            if (webSocket != null && webSocket.State == WebSocketState.Open)
            {
                tasks.Add(webSocket.SendAsync(
                    new ArraySegment<byte>(messageBytes),
                    WebSocketMessageType.Text,
                    true,
                    CancellationToken.None
                ));
            }
        }

        await Task.WhenAll(tasks);
    }
    public async Task BroadcastMessageAsync(string message)
    {
        var wsMessage = new WsMessage<string>
        {
            code = 0,
            Type = "broadcast",
            Payload = message
        };
        var messageString = System.Text.Json.JsonSerializer.Serialize(wsMessage);
        await BroadcastAsync(messageString);
    }
    public async Task BroadcastObjectAsync<T>(T obj)
    {
        var wsMessage = new WsMessage<T>
        {
            code = 0,
            Type = "broadcast",
            Payload = obj
        };
        var messageString = System.Text.Json.JsonSerializer.Serialize(wsMessage);
        await BroadcastAsync(messageString);
    }

    // Broadcast activity-related events
    public async Task BroadcastActivityCreatedAsync(Activity activity)
    {
        var wsMessage = new WsMessage<object>
        {
            code = 0,
            Type = "ACTIVITY_CREATED",
            Payload = new
            {
                activityId = activity.Id,
                activityType = activity.Type.ToString(),
                title = activity.Title,
                description = activity.Description,
                isActive = activity.IsActive,
                hasBeenActivated = activity.HasBeenActivated,
                expiresAt = activity.ExpiresAt,
                createdAt = activity.CreatedAt
            }
        };
        var messageString = System.Text.Json.JsonSerializer.Serialize(wsMessage);
        await BroadcastAsync(messageString);
    }

    public async Task BroadcastActivityUpdatedAsync(Activity activity)
    {
        var wsMessage = new WsMessage<object>
        {
            code = 0,
            Type = "ACTIVITY_UPDATED",
            Payload = new
            {
                activityId = activity.Id,
                activityType = activity.Type.ToString(),
                title = activity.Title,
                description = activity.Description,
                isActive = activity.IsActive,
                hasBeenActivated = activity.HasBeenActivated,
                expiresAt = activity.ExpiresAt
            }
        };
        var messageString = System.Text.Json.JsonSerializer.Serialize(wsMessage);
        await BroadcastAsync(messageString);
    }

    public async Task BroadcastActivityDeletedAsync(string activityId)
    {
        var wsMessage = new WsMessage<object>
        {
            code = 0,
            Type = "ACTIVITY_DELETED",
            Payload = new
            {
                activityId = activityId
            }
        };
        var messageString = System.Text.Json.JsonSerializer.Serialize(wsMessage);
        await BroadcastAsync(messageString);
    }

    public async Task BroadcastActivityDeactivatedAsync(string activityId, bool hasBeenActivated)
    {
        var wsMessage = new WsMessage<object>
        {
            code = 0,
            Type = "ACTIVITY_DEACTIVATED",
            Payload = new
            {
                activityId = activityId,
                hasBeenActivated = hasBeenActivated
            }
        };
        var messageString = System.Text.Json.JsonSerializer.Serialize(wsMessage);
        await BroadcastAsync(messageString);
    }

    public async Task BroadcastNewSubmissionAsync(string activityId, string studentId, ActivityType activityType)
    {
        var wsMessage = new WsMessage<object>
        {
            code = 0,
            Type = "NEW_SUBMISSION",
            Payload = new
            {
                activityId = activityId,
                studentId = studentId,
                activityType = activityType.ToString(),
                submittedAt = DateTime.UtcNow
            }
        };
        var messageString = System.Text.Json.JsonSerializer.Serialize(wsMessage);
        await BroadcastAsync(messageString);
    }

    public async Task BroadcastStudentJoinedAsync(string studentId, string studentName)
    {
        // Count current online students (with active WebSocket)
        var onlineCount = ActiveStudents.Values
            .Count(s => s.webSocket != null && s.webSocket.State == WebSocketState.Open);

        var wsMessage = new WsMessage<object>
        {
            code = 0,
            Type = "STUDENT_JOINED",
            Payload = new
            {
                studentId = studentId,
                studentName = studentName,
                onlineStudentsCount = onlineCount,
                joinedAt = DateTime.UtcNow
            }
        };
        var messageString = System.Text.Json.JsonSerializer.Serialize(wsMessage);

        // Only broadcast to instructors
        await BroadcastToInstructorsAsync(messageString);
    }

    public async Task BroadcastStudentLeftAsync(string studentId, string studentName)
    {
        // Count current online students (with active WebSocket)
        var onlineCount = ActiveStudents.Values
            .Count(s => s.webSocket != null && s.webSocket.State == WebSocketState.Open);

        var wsMessage = new WsMessage<object>
        {
            code = 0,
            Type = "STUDENT_LEFT",
            Payload = new
            {
                studentId = studentId,
                studentName = studentName,
                onlineStudentsCount = onlineCount,
                leftAt = DateTime.UtcNow
            }
        };
        var messageString = System.Text.Json.JsonSerializer.Serialize(wsMessage);

        // Only broadcast to instructors
        await BroadcastToInstructorsAsync(messageString);
    }

    private async Task BroadcastToInstructorsAsync(string message)
    {
        var messageBytes = System.Text.Encoding.UTF8.GetBytes(message);
        var tasks = new List<Task>();

        // Only broadcast to instructors
        foreach (var webSocket in InstructorWebSockets)
        {
            if (webSocket != null && webSocket.State == WebSocketState.Open)
            {
                tasks.Add(webSocket.SendAsync(
                    new ArraySegment<byte>(messageBytes),
                    WebSocketMessageType.Text,
                    true,
                    CancellationToken.None
                ));
            }
        }

        await Task.WhenAll(tasks);
    }



    public async Task HandleWebsocket(string token, WebSocket webSocket)
    {
        var joinedStudent = ActiveStudents.Values.FirstOrDefault(s => s.Token == token);

        if (joinedStudent == null)
        {
            await CloseWithError(webSocket, "FORCE_RELOGIN");
            return;
        }

        // Assign WebSocket to the student
        joinedStudent.webSocket = webSocket;

        // Broadcast STUDENT_JOINED message to all instructors
        await BroadcastStudentJoinedAsync(joinedStudent.StudentId, joinedStudent.StudentName);

        // Buffer for receiving message fragments
        var buffer = new byte[1024 * 4]; // 4KB per fragment

        while (webSocket.State == WebSocketState.Open)
        {
            try
            {
                // Use MemoryStream to accumulate message fragments
                using var messageStream = new MemoryStream();
                WebSocketReceiveResult result;

                do
                {
                    result = await webSocket.ReceiveAsync(
                        new ArraySegment<byte>(buffer),
                        CancellationToken.None
                    );

                    // Write the received bytes to the stream
                    messageStream.Write(buffer, 0, result.Count);

                } while (!result.EndOfMessage); // Continue until complete message received

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await webSocket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Closing",
                        CancellationToken.None
                    );
                    break;
                }
                else if (result.MessageType == WebSocketMessageType.Text)
                {
                    // Get complete message from stream
                    messageStream.Seek(0, SeekOrigin.Begin);
                    var completeMessage = System.Text.Encoding.UTF8.GetString(messageStream.ToArray());

                    // TODO: Process the complete message
                    Console.WriteLine($"Received message from student {joinedStudent.StudentId}: {completeMessage}");
                }
            }
            catch (WebSocketException wsEx)
            {
                Console.WriteLine($"WebSocket error for student {joinedStudent?.StudentId}: {wsEx.Message}");
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error handling WebSocket message: {ex.Message}");
                await CloseWithError(webSocket, "INTERNAL_ERROR");
                break;
            }
        }

        // WebSocket disconnected - clear the reference and broadcast to instructors
        joinedStudent!.webSocket = null;
        await BroadcastStudentLeftAsync(joinedStudent.StudentId, joinedStudent.StudentName);
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

    public void AddStudent(JoinedStudent student)
    {
        if (!ActiveStudents.ContainsKey(student.StudentId))
        {
            ActiveStudents.TryAdd(student.StudentId, student);
        }
        else
        {
            //TODO: Kick previous connection
            ActiveStudents.Remove(student.StudentId, out _);
            ActiveStudents.TryAdd(student.StudentId, student);
        }
    }

    // Handle instructor WebSocket connection
    public async Task HandleInstructorWebsocket(WebSocket webSocket)
    {
        // Add instructor WebSocket to the collection
        InstructorWebSockets.Add(webSocket);

        // Count students with active WebSocket connections
        var onlineStudentsCount = ActiveStudents.Values
            .Count(student => student.webSocket != null && student.webSocket.State == WebSocketState.Open);

        // Send initial connection success message
        var welcomeMessage = new WsMessage<object>
        {
            code = 0,
            Type = "CONNECTED",
            Payload = new
            {
                message = "Instructor connected successfully",
                courseId = CourseId,
                activeStudents = onlineStudentsCount,
                courseName = Course?.CourseName
            }
        };
        var welcomeJson = System.Text.Json.JsonSerializer.Serialize(welcomeMessage);
        var welcomeBytes = System.Text.Encoding.UTF8.GetBytes(welcomeJson);
        await webSocket.SendAsync(
            new ArraySegment<byte>(welcomeBytes),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );

        // Keep connection alive and listen for messages
        var buffer = new byte[1024 * 4];
        while (webSocket.State == WebSocketState.Open)
        {
            try
            {
                var result = await webSocket.ReceiveAsync(
                    new ArraySegment<byte>(buffer),
                    CancellationToken.None
                );

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await webSocket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Closing",
                        CancellationToken.None
                    );
                    break;
                }
                else if (result.MessageType == WebSocketMessageType.Text)
                {
                    var message = System.Text.Encoding.UTF8.GetString(buffer, 0, result.Count);
                    Console.WriteLine($"Received message from instructor: {message}");
                    // Handle instructor commands if needed
                }
            }
            catch (WebSocketException wsEx)
            {
                Console.WriteLine($"WebSocket error for instructor: {wsEx.Message}");
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error handling instructor WebSocket: {ex.Message}");
                break;
            }
        }

        // Remove instructor WebSocket from collection when disconnected
        var wsList = InstructorWebSockets.ToList();
        wsList.Remove(webSocket);
        InstructorWebSockets.Clear();
        foreach (var ws in wsList)
        {
            InstructorWebSockets.Add(ws);
        }
    }

    public static RealtimeClass Create(TeachingCourse course)
    {
        // Implementation to get or create a RealtimeClass instance
        return new RealtimeClass
        {
            CourseId = course.Id,
            Course = course  // Store the course for future reference
        };
    }
    public bool IsMatch(string courseId)
    {
        return CourseId == courseId;
    }
}


public class CreateSingleClassRequest
{
    public string CourseId { get; set; } = string.Empty;
    public string Identifier { get; set; } = string.Empty;
    public string? Description { get; set; } = string.Empty;
    public DateOnly Date { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public TimeOnly From { get; set; } = TimeOnly.FromDateTime(DateTime.UtcNow);
    public TimeOnly To { get; set; } = TimeOnly.FromDateTime(DateTime.UtcNow);
}

