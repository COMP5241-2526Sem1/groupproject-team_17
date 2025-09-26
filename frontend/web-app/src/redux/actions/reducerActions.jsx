import { courseAPI } from "src/api/api-function-call";
import { sliceActions as classManActions } from "../slices/classManagement"
import { dispatch } from "../store"











export const ClassManagementActions = {
    getAllClasses: async () => {
        const res = await courseAPI.getAllCourses();
        if (res) {
            dispatch(classManActions.setClasses(res));
        }
    },

    incrementCounter: () => {
        dispatch(classManActions.incrementCounter());
    }

}