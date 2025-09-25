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
  },
};

// Helper function to build endpoint URLs
export const buildEndpoint = (template, ...params) => {
  if (typeof template === 'function') {
    return template(...params);
  }
  return template;
};
