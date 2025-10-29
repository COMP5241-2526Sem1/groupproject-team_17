'use client';

import { createContext, use } from 'react';

// ----------------------------------------------------------------------

export const InstructorWebSocketContext = createContext(undefined);

export const useInstructorWebSocket = () => {
  const context = use(InstructorWebSocketContext);

  if (!context) {
    throw new Error('useInstructorWebSocket must be used within InstructorWebSocketProvider');
  }

  return context;
};
