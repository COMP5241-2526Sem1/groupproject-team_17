# Activity Management API Usage Guide

## Overview
This document explains how to use the Activity and Submission management methods in ClassManager.

## Activity Types
- **Quiz**: Timed quiz with multiple questions and automatic scoring
- **Poll**: Single or multiple choice polling with optional anonymity
- **Discussion**: Open text discussion with optional approval workflow

---

## Create Activity

### Create a Quiz
```csharp
var quizData = JsonNode.Parse("""
{
  "title": "Introduction to C# Quiz",
  "description": "Test your C# knowledge",
  "timeLimit": 600,
  "showCorrectAnswers": true,
  "shuffleQuestions": false,
  "questions": [
    {
      "text": "What is polymorphism?",
      "options": ["Inheritance", "Multiple forms", "Encapsulation", "Abstraction"],
      "correctAnswer": 1,
      "points": 10,
      "explanation": "Polymorphism allows objects to take multiple forms"
    },
    {
      "text": "Which keyword is used for inheritance?",
      "options": ["extends", "implements", ":", "inherits"],
      "correctAnswer": 2,
      "points": 5
    }
  ]
}
""")!.AsObject();

var (code, activity) = await classManager.CreateActivityAsync(
    courseId: "crs.abc123",
    activityType: ActivityType.Quiz,
    activityData: quizData
);

if (code == ResCode.OK && activity != null)
{
    Console.WriteLine($"Quiz created: {activity.Id}");
}
```

### Create a Poll
```csharp
var pollData = JsonNode.Parse("""
{
  "title": "Favorite Programming Language",
  "description": "Vote for your favorite",
  "allowMultipleSelections": false,
  "isAnonymous": true,
  "options": [
    { "text": "C#", "imageUrl": null },
    { "text": "Python", "imageUrl": null },
    { "text": "JavaScript", "imageUrl": null },
    { "text": "Java", "imageUrl": null }
  ]
}
""")!.AsObject();

var (code, activity) = await classManager.CreateActivityAsync(
    courseId: "crs.abc123",
    activityType: ActivityType.Polling,
    activityData: pollData
);
```

### Create a Discussion
```csharp
var discussionData = JsonNode.Parse("""
{
  "title": "What did you learn today?",
  "description": "Share your insights from today's lecture",
  "maxLength": 500,
  "allowAnonymous": false,
  "requireApproval": false
}
""")!.AsObject();

var (code, activity) = await classManager.CreateActivityAsync(
    courseId: "crs.abc123",
    activityType: ActivityType.Discussion,
    activityData: discussionData
);
```

---

## Retrieve Activities

### Get Single Activity
```csharp
var (code, activity) = await classManager.GetActivityAsync("act.xyz789");

if (code == ResCode.OK && activity != null)
{
    switch (activity)
    {
        case Quiz quiz:
            Console.WriteLine($"Quiz: {quiz.Title}, Questions: {quiz.Questions.Count}");
            break;
        case Poll poll:
            Console.WriteLine($"Poll: {poll.Title}, Options: {poll.Options.Count}");
            break;
        case Discussion discussion:
            Console.WriteLine($"Discussion: {discussion.Title}");
            break;
    }
}
```

### Get All Activities in a Course
```csharp
// Get all activities
var (code, activities) = await classManager.GetCourseActivitiesAsync("crs.abc123");

// Get only active activities
var (code2, activeActivities) = await classManager.GetCourseActivitiesAsync(
    courseId: "crs.abc123",
    activeOnly: true
);

foreach (var activity in activities)
{
    Console.WriteLine($"{activity.Type}: {activity.Title} - Active: {activity.IsActive}");
}
```

### Get Specific Activity Types
```csharp
// Get only quizzes
var (code, quizzes) = await classManager.GetCourseQuizzesAsync("crs.abc123");
foreach (var quiz in quizzes)
{
    Console.WriteLine($"Quiz: {quiz.Title}, Time Limit: {quiz.Quiz_TimeLimit}s");
}

// Get only polls
var (code2, polls) = await classManager.GetCoursePolls("crs.abc123");
foreach (var poll in polls)
{
    Console.WriteLine($"Poll: {poll.Title}, Anonymous: {poll.Poll_IsAnonymous}");
}
```

---

## Submit Responses

### Submit Quiz Answer
```csharp
var submissionData = JsonNode.Parse("""
{
  "answers": [1, 2, 0, 3],
  "timeSpent": 240
}
""")!.AsObject();

var (code, submission) = await classManager.SubmitQuizAsync(
    quizId: "act.quiz123",
    studentId: "stu.student456",
    submissionData: submissionData
);

if (code == ResCode.OK && submission is QuizSubmission quizSub)
{
    Console.WriteLine($"Quiz submitted! Score: {quizSub.Quiz_Score:F2}%");
}
else if (code == ResCode.AlreadySubmitted)
{
    Console.WriteLine("You have already submitted this quiz");
}
```

### Submit Poll Vote
```csharp
var submissionData = JsonNode.Parse("""
{
  "selectedOptions": [2]
}
""")!.AsObject();

var (code, submission) = await classManager.SubmitPollAsync(
    pollId: "act.poll123",
    studentId: "stu.student456",
    submissionData: submissionData
);

if (code == ResCode.OK)
{
    Console.WriteLine("Poll vote submitted!");
}
```

---

## Retrieve Submissions

### Get All Submissions for an Activity
```csharp
var (code, submissions) = await classManager.GetActivitySubmissionsAsync("act.quiz123");

foreach (var sub in submissions)
{
    Console.WriteLine($"Student: {sub.StudentId}, Submitted: {sub.SubmittedAt}");

    if (sub is QuizSubmission quizSub)
    {
        Console.WriteLine($"  Score: {quizSub.Quiz_Score:F2}%");
    }
}
```

### Get Student's Submission
```csharp
var (code, submission) = await classManager.GetStudentSubmissionAsync(
    activityId: "act.quiz123",
    studentId: "stu.student456"
);

if (code == ResCode.OK && submission != null)
{
    Console.WriteLine($"Submitted at: {submission.SubmittedAt}");
}
else if (code == ResCode.SubmissionNotFound)
{
    Console.WriteLine("Student has not submitted yet");
}
```

### Get Quiz Submissions with Scores
```csharp
var (code, submissions) = await classManager.GetQuizSubmissionsAsync("act.quiz123");

// Submissions are ordered by score (highest first)
Console.WriteLine("Leaderboard:");
for (int i = 0; i < submissions.Count; i++)
{
    var sub = submissions[i];
    Console.WriteLine($"{i+1}. Student {sub.StudentId}: {sub.Quiz_Score:F2}%");
}
```

---

## Response Codes

| Code | Description |
|------|-------------|
| `ResCode.OK` | Operation succeeded |
| `ResCode.CourseNotFound` | Course does not exist |
| `ResCode.ActivityNotFound` | Activity does not exist |
| `ResCode.ActivityExpired` | Activity is no longer active |
| `ResCode.AlreadySubmitted` | Student already submitted |
| `ResCode.SubmissionNotFound` | No submission found |
| `ResCode.InvalidActivityType` | Unknown activity type |
| `ResCode.DatabaseError` | Database operation failed |

---

## Database Schema

### Activities Table (TPH)
- Stores all activity types in one table
- `Type` column discriminates between Quiz/Poll/Discussion
- Quiz-specific: `Quiz_QuestionsJson`, `Quiz_TimeLimit`, `Quiz_ShowCorrectAnswers`, `Quiz_ShuffleQuestions`
- Poll-specific: `Poll_OptionsJson`, `Poll_AllowMultipleSelections`, `Poll_IsAnonymous`
- Discussion-specific: `Discussion_MaxLength`, `Discussion_AllowAnonymous`, `Discussion_RequireApproval`

### Submissions Table (TPH)
- Stores all submission types in one table
- `Type` column discriminates between QuizSubmission/PollSubmission/DiscussionSubmission
- QuizSubmission: `Quiz_AnswersJson`, `Quiz_Score`, `Quiz_TimeSpent`
- PollSubmission: `Poll_SelectedOptionsJson`
- DiscussionSubmission: `Discussion_Text`, `Discussion_IsApproved`, `Discussion_IsAnonymous`

### Indexes
- Activities: `(CourseId)`, `(CourseId, IsActive)`
- Submissions: `(ActivityId)`, `(StudentId, ActivityId)`, `(CourseId, ActivityId)`

---

## Example: Complete Quiz Flow

```csharp
// 1. Teacher creates a quiz
var quizData = JsonNode.Parse("""
{
  "title": "Midterm Quiz",
  "timeLimit": 1800,
  "questions": [ /* ... */ ]
}
""")!.AsObject();

var (createCode, quiz) = await classManager.CreateActivityAsync(
    "crs.abc123", ActivityType.Quiz, quizData
);

// 2. Student retrieves the quiz
var (getCode, activity) = await classManager.GetActivityAsync(quiz!.Id);
if (activity is Quiz q)
{
    // Display questions to student
}

// 3. Student submits answers
var answerData = JsonNode.Parse("""{ "answers": [1,2,0], "timeSpent": 600 }""")!.AsObject();
var (submitCode, submission) = await classManager.SubmitQuizAsync(
    quiz.Id, "stu.student123", answerData
);

// 4. Teacher views all submissions
var (listCode, submissions) = await classManager.GetQuizSubmissionsAsync(quiz.Id);
foreach (var sub in submissions)
{
    Console.WriteLine($"{sub.StudentId}: {sub.Quiz_Score}%");
}
```

---

## Notes

- All activities inherit from the `Activity` base class
- All submissions inherit from the `Submission` base class
- JSON columns store complex data (questions, options, answers)
- NotMapped properties provide object access to JSON data
- Score calculation is automatic for quizzes (percentage based on points)
- TPH (Table Per Hierarchy) pattern is used for inheritance
- Activities can be filtered by `IsActive` status
- Duplicate submissions are prevented with `AlreadySubmitted` check
