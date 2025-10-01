// API Function Calls for InteractiveHub WebAPI
// Auto-generated from backend controllers (excluding TestAuth and WeatherForecast)

import { API_ENDPOINTS } from './api-endpoint';
import { httpGet, httpPut, httpPost, httpDelete } from '../lib/axios';

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
*/
