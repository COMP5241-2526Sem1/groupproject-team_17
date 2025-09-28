import { createSlice } from "@reduxjs/toolkit";
import { set } from "nprogress";




const initialState = {
    courses: [],
    loadingCourses: false,


    counter: 0,
    loading: false,
    error: null,
};
const slice = createSlice({
    name: "classManagement",
    initialState,
    reducers: {
        setAllCourses: (state, action) => {
            state.courses = action.payload;
        },
        clearCourses: (state) => {
            state.courses = [];
        },
        setLoadingCourses: (state, action) => {
            state.loadingCourses = action.payload;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        incrementCounter: (state) => {
            state.counter += 1;
        }
    }
});
export default slice.reducer;
export const sliceActions = slice.actions;

