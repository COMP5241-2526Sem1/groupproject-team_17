import { createSlice } from "@reduxjs/toolkit";
import { set } from "nprogress";




const initialState = {
    classes: [],
    counter: 0,
    loading: false,
    error: null,
};
const slice = createSlice({
    name: "classManagement",
    initialState,
    reducers: {
        setClasses: (state, action) => {
            state.classes = action.payload;
        },
        clearClasses: (state) => {
            state.classes = [];
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

