'use client'
import { combineReducers, configureStore } from "@reduxjs/toolkit"

import classManagementReducer from "./slices/classManagement";




const combinedReducer = combineReducers({
    classManagement: classManagementReducer
});


export const store = configureStore({
    reducer: combinedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST'],
            },
        }),
});

export const dispatch = store.dispatch;

