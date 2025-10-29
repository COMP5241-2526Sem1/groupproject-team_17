'use client';

import { createContext, useContext } from 'react';

// ----------------------------------------------------------------------

export const ClassroomContext = createContext(undefined);

export const useClassroomContext = () => {
  const context = useContext(ClassroomContext);

  if (!context) {
    throw new Error('useClassroomContext must be used within a ClassroomProvider');
  }

  return context;
};
