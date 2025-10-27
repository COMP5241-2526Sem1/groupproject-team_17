import { courseAPI } from 'src/api/api-function-call';

import { dispatch } from '../store';
import { sliceActions as classManActions } from '../slices/classManagement';

export const ClassManagementActions = {
  getAllCourses: async () => {
    dispatch(classManActions.setLoadingCourses(true));
    const res = await courseAPI.getAllCourses();
    if (res.code === 0) {
      dispatch(classManActions.setAllCourses(res.data));
    }
    dispatch(classManActions.setLoadingCourses(false));
  },
  updateCourse: async (courseId, courseData) => {
    const res = await courseAPI.updateCourse(courseId, courseData);
    if (res.code === 0) {
      // Optionally refresh course details after update
      await ClassManagementActions.getCourseDetails(courseId);
      await ClassManagementActions.getAllCourses();
    }
    return res;
  },
  deleteCourse: async (courseId) => {
    const res = await courseAPI.deleteCourse(courseId);
    if (res.code === 0) {
      // Optionally refresh course list after deletion
      await ClassManagementActions.getAllCourses();
    }
    return res;
  },
  getCourseDetails: async (courseId) => {
    dispatch(classManActions.setLoadingCourseDetails(true));
    const res = await courseAPI.getCourse(courseId);
    if (res.code === 0) {
      dispatch(classManActions.setSelectedCourse(res.data));
    }
    dispatch(classManActions.setLoadingCourseDetails(false));
    return res;
  },
  uploadStudents: async (courseId, students) => {
    const res = await courseAPI.addOrUpdateStudents(courseId, students);
    if (res.code === 0) {
      // Success case - could add logging or additional processing here
    }
    return res;
  },
  removeStudentsFromCourse: async (courseId, studentIds = []) => {
    const res = await courseAPI.removeStudents(courseId, [...studentIds]);
    return res;
  },
  createCourse: async (courseData) => {
    const res = await courseAPI.createCourse(courseData);
    if (res.code === 0) {
      // Optionally refresh course list after creation
      await ClassManagementActions.getAllCourses();
    }

    return res;
  },

  incrementCounter: () => {
    dispatch(classManActions.incrementCounter());
  },
};
