// API Endpoints for InteractiveHub WebAPI
// Auto-generated from backend controllers (excluding TestAuth and WeatherForecast)

export const API_ENDPOINTS = {
  // Course Management (ClassManagementController)
  COURSE: {
    GET_COURSE: (courseId) => `/api/Course/GetCourse/${courseId}`,
    GET_ALL_COURSES: '/api/Course/GetAllCourses',
    CREATE_COURSE: '/api/Course/CreateCourse',
    UPDATE_COURSE: (courseId) => `/api/Course/UpdateCourse/${courseId}`,
    DELETE_COURSE: (courseId) => `/api/Course/DeleteCourse/${courseId}`,
    ADD_OR_UPDATE_STUDENTS: (courseId) => `/api/Course/AddOrUpdateStudents/${courseId}`,
    REMOVE_STUDENT: (courseId, studentId) => `/api/Course/${courseId}/RemoveStudent/${studentId}`,
    REMOVE_STUDENTS: (courseId) => `/api/Course/${courseId}/RemoveStudents`,
    GET_LEADERBOARD: (courseId) => `/api/Course/GetLeaderboard/${courseId}`,
  },

  // RealTime Class Management (RealTimeClassController)
  REALTIME_CLASS: {
    // Join/Auth endpoints
    GET_COURSE_JOIN_INFO: (joinCode) => `/api/RealTimeClass/${joinCode}`,
    STUDENT_JOIN_COURSE: '/api/RealTimeClass/StudentJoin',
    VALIDATE_JOIN_TOKEN: '/api/RealTimeClass/ValidateJoinToken',
    CONNECT_WEBSOCKET: (token) => `/api/RealTimeClass/Connect/${encodeURIComponent(token)}`,
    CONNECT_INSTRUCTOR_WEBSOCKET: (courseId) => `/api/RealTimeClass/ConnectInstructor/${courseId}`,

    // Classroom status
    GET_CLASSROOM_STATUS: (courseId) => `/api/RealTimeClass/Course/${courseId}/Status`,
  },

  // Activity Management (RealTimeClassController)
  ACTIVITY: {
    // Create activity
    CREATE_ACTIVITY: (courseId) => `/api/RealTimeClass/Course/${courseId}/Activity`,

    // Get activities
    GET_ACTIVITY: (activityId) => `/api/RealTimeClass/Activity/${activityId}`,
    GET_COURSE_ACTIVITIES: (courseId) => `/api/RealTimeClass/Course/${courseId}/Activities`,
    GET_COURSE_QUIZZES: (courseId) => `/api/RealTimeClass/Course/${courseId}/Quizzes`,
    GET_COURSE_POLLS: (courseId) => `/api/RealTimeClass/Course/${courseId}/Polls`,

    // Update/Delete activity
    UPDATE_ACTIVITY: (activityId) => `/api/RealTimeClass/Activity/${activityId}`,
    DELETE_ACTIVITY: (activityId) => `/api/RealTimeClass/Activity/${activityId}`,
    DEACTIVATE_ACTIVITY: (activityId) => `/api/RealTimeClass/Activity/${activityId}/Deactivate`,

    // Submissions
    GET_ACTIVITY_SUBMISSIONS: (activityId) => `/api/RealTimeClass/Activity/${activityId}/Submissions`,
    GET_STUDENT_SUBMISSION: (activityId, studentId) => `/api/RealTimeClass/Activity/${activityId}/Student/${studentId}/Submission`,
    GET_QUIZ_SUBMISSIONS: (quizId) => `/api/RealTimeClass/Quiz/${quizId}/Submissions`,

    // Submit responses
    SUBMIT_QUIZ: (quizId) => `/api/RealTimeClass/Quiz/${quizId}/Submit`,
    SUBMIT_POLL: (pollId) => `/api/RealTimeClass/Poll/${pollId}/Submit`,
    SUBMIT_DISCUSSION: (discussionId) => `/api/RealTimeClass/Discussion/${discussionId}/Submit`,
  },

  // AI Assistant (AIAssistantController)
  AI_ASSISTANT: {
    CREATE_CONVERSATION: '/api/AIAssistant/CreateConversation',
    SEND_MESSAGE: '/api/AIAssistant/SendMessage',
    SEND_MESSAGE_STREAM: '/api/AIAssistant/SendMessageStream',
    GET_CONVERSATION: (conversationId) => `/api/AIAssistant/GetConversation/${conversationId}`,
    GET_MY_CONVERSATIONS: '/api/AIAssistant/GetMyConversations',
    COMPLETE_CONVERSATION: '/api/AIAssistant/CompleteConversation',
    UPLOAD_PDF: '/api/AIAssistant/UploadPdf',
    DELETE_CONVERSATION: (conversationId) => `/api/AIAssistant/DeleteConversation/${conversationId}`,
  },
};

// Helper function to build endpoint URLs
export const buildEndpoint = (template, ...params) => {
  if (typeof template === 'function') {
    return template(...params);
  }
  return template;
};
