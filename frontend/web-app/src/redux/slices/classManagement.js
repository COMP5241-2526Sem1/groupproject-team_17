import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  courses: [],
  loadingCourses: false,
  selectedCourse: null,
  loadingCourseDetails: false,

  counter: 0,
  loading: false,
  error: null,
};
const slice = createSlice({
  name: 'classManagement',
  initialState,
  reducers: {
    setAllCourses: (state, action) => {
      state.courses = action.payload;
    },
    setSelectedCourse: (state, action) => {
      state.selectedCourse = action.payload;
    },
    setLoadingCourseDetails: (state, action) => {
      state.loadingCourseDetails = action.payload;
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
    },
  },
});
export default slice.reducer;
export const sliceActions = slice.actions;
