// API Function Calls for InteractiveHub WebAPI
// Auto-generated from backend controllers (excluding TestAuth and WeatherForecast)

import { httpDelete, httpGet, httpPost, httpPut } from '../lib/axios';
import { API_ENDPOINTS } from './api-endpoint';

// RealTime Class API Functions
export const realtimeClassAPI = {
  // Get course join information by join code
  getCourseJoinInfo: async (joinCode) =>
    httpGet(API_ENDPOINTS.REALTIME_CLASS.GET_COURSE_JOIN_INFO(joinCode)),

  // Student join course
  studentJoinCourse: async (joinData) =>
    httpPost(API_ENDPOINTS.REALTIME_CLASS.STUDENT_JOIN_COURSE, joinData),

  // Validate join token
  validateJoinToken: async (tokenData) =>
    httpPost(API_ENDPOINTS.REALTIME_CLASS.VALIDATE_JOIN_TOKEN, tokenData),

  // Get WebSocket connection URL (for establishing WebSocket connection)
  getWebSocketUrl: (token) => API_ENDPOINTS.REALTIME_CLASS.CONNECT_WEBSOCKET(token),

  // Get instructor WebSocket connection URL
  getInstructorWebSocketUrl: (courseId) => API_ENDPOINTS.REALTIME_CLASS.CONNECT_INSTRUCTOR_WEBSOCKET(courseId),

  // Get classroom status (current activity and joined students count)
  getClassroomStatus: async (courseId) =>
    httpGet(API_ENDPOINTS.REALTIME_CLASS.GET_CLASSROOM_STATUS(courseId)),
};

// Course Management API Functions
export const courseAPI = {
  // GET /api/Course/GetCourse/{courseId}
  getCourse: async (courseId) => httpGet(API_ENDPOINTS.COURSE.GET_COURSE(courseId)),

  // GET /api/Course/GetAllCourses
  getAllCourses: async () => httpGet(API_ENDPOINTS.COURSE.GET_ALL_COURSES),

  // POST /api/Course/CreateCourse
  createCourse: async (courseData) => httpPost(API_ENDPOINTS.COURSE.CREATE_COURSE, courseData),

  // PUT /api/Course/UpdateCourse/{courseId}
  updateCourse: async (courseId, courseData) =>
    httpPut(API_ENDPOINTS.COURSE.UPDATE_COURSE(courseId), courseData),

  // DELETE /api/Course/DeleteCourse/{courseId}
  deleteCourse: async (courseId) =>
    httpDelete(API_ENDPOINTS.COURSE.DELETE_COURSE(courseId), {}, { method: 'DELETE' }),

  // POST /api/Course/AddOrUpdateStudents/{courseId}
  addOrUpdateStudents: async (courseId, students) =>
    httpPost(API_ENDPOINTS.COURSE.ADD_OR_UPDATE_STUDENTS(courseId), students),

  // DELETE /api/Course/{courseId}/RemoveStudent/{studentId}
  removeStudent: async (courseId, studentId) =>
    httpDelete(API_ENDPOINTS.COURSE.REMOVE_STUDENT(courseId, studentId), {}, { method: 'DELETE' }),

  // DELETE /api/Course/{courseId}/RemoveStudents
  removeStudents: async (courseId, studentIds) =>
    httpDelete(API_ENDPOINTS.COURSE.REMOVE_STUDENTS(courseId), studentIds, { method: 'DELETE' }),
};

// Activity Management API Functions
export const activityAPI = {
  // Create a new activity (Quiz, Poll, or Discussion)
  createActivity: async (courseId, activityData) =>
    httpPost(API_ENDPOINTS.ACTIVITY.CREATE_ACTIVITY(courseId), activityData),

  // Get activity by ID
  getActivity: async (activityId) => httpGet(API_ENDPOINTS.ACTIVITY.GET_ACTIVITY(activityId)),

  // Get all activities for a course
  getCourseActivities: async (courseId, activeOnly = false) =>
    httpGet(`${API_ENDPOINTS.ACTIVITY.GET_COURSE_ACTIVITIES(courseId)}?activeOnly=${activeOnly}`),

  // Get quizzes for a course
  getCourseQuizzes: async (courseId) =>
    httpGet(API_ENDPOINTS.ACTIVITY.GET_COURSE_QUIZZES(courseId)),

  // Get polls for a course
  getCoursePolls: async (courseId) => httpGet(API_ENDPOINTS.ACTIVITY.GET_COURSE_POLLS(courseId)),

  // Update activity
  updateActivity: async (activityId, updateData) =>
    httpPut(API_ENDPOINTS.ACTIVITY.UPDATE_ACTIVITY(activityId), updateData),

  // Delete activity (hard delete)
  deleteActivity: async (activityId) =>
    httpDelete(API_ENDPOINTS.ACTIVITY.DELETE_ACTIVITY(activityId)),

  // Deactivate activity (soft delete)
  deactivateActivity: async (activityId) =>
    httpPut(API_ENDPOINTS.ACTIVITY.DEACTIVATE_ACTIVITY(activityId), {}),

  // Get all submissions for an activity
  getActivitySubmissions: async (activityId) =>
    httpGet(API_ENDPOINTS.ACTIVITY.GET_ACTIVITY_SUBMISSIONS(activityId)),

  // Get student's submission for an activity
  getStudentSubmission: async (activityId, studentId) =>
    httpGet(API_ENDPOINTS.ACTIVITY.GET_STUDENT_SUBMISSION(activityId, studentId)),

  // Get quiz submissions with scores
  getQuizSubmissions: async (quizId) =>
    httpGet(API_ENDPOINTS.ACTIVITY.GET_QUIZ_SUBMISSIONS(quizId)),

  // Submit quiz answer
  submitQuiz: async (quizId, submissionData) =>
    httpPost(API_ENDPOINTS.ACTIVITY.SUBMIT_QUIZ(quizId), submissionData),

  // Submit poll vote
  submitPoll: async (pollId, submissionData) =>
    httpPost(API_ENDPOINTS.ACTIVITY.SUBMIT_POLL(pollId), submissionData),
};

// Usage Examples:
/*
// Get all courses
const courses = await courseAPI.getAllCourses();

// Create a new course
const newCourse = await courseAPI.createCourse({
  courseName: "Math 101",
  description: "Basic Mathematics"
});

// Get a specific course
const course = await courseAPI.getCourse("course-id-123");

// Update a course
const updated = await courseAPI.updateCourse("course-id-123", {
  courseName: "Advanced Math 101"
});

// Add students to course
const addedStudents = await courseAPI.addOrUpdateStudents("course-id-123", [
  { studentId: "student1", name: "John Doe" },
  { studentId: "student2", name: "Jane Smith" }
]);

// Create a quiz
const quiz = await activityAPI.createActivity("course-id-123", {
  type: "Quiz",
  activityData: {
    title: "React Fundamentals Quiz",
    description: "Test your React knowledge",
    timeLimit: 600,
    showCorrectAnswers: true,
    questions: [
      {
        text: "What is JSX?",
        options: ["JavaScript XML", "Java Syntax Extension", "JSON eXtension", "None"],
        correctAnswer: 0,
        points: 10
      }
    ]
  }
});

// Get all activities for a course
const activities = await activityAPI.getCourseActivities("course-id-123");

// Get only active activities
const activeActivities = await activityAPI.getCourseActivities("course-id-123", true);

// Submit a quiz
const submission = await activityAPI.submitQuiz("quiz-id-456", {
  studentId: "student-123",
  answers: [0, 2, 1],
  timeSpent: 240
});

// Get quiz submissions (leaderboard)
const submissions = await activityAPI.getQuizSubmissions("quiz-id-456");
*/

