import { courseAPI } from "src/api/api-function-call";
import { sliceActions as classManActions } from "../slices/classManagement"
import { dispatch } from "../store"











export const ClassManagementActions = {
    getAllCourses: async () => {
        dispatch(classManActions.setLoadingCourses(true));
        const res = await courseAPI.getAllCourses();
        if (res.code === 0){
            dispatch(classManActions.setAllCourses(res.data));
        }
        dispatch(classManActions.setLoadingCourses(false));
    },
    createCourse: async (courseData) => {
        const res = await courseAPI.createCourse(courseData);
        return res;
    },
    incrementCounter: () => {
        dispatch(classManActions.incrementCounter());
    }

}