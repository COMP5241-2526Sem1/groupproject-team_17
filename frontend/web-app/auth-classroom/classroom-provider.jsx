'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { removeCookie, setCookie } from 'minimal-shared/utils';
import { CONFIG } from 'src/global-config';
import { ClassroomContext } from './classroom-context';

// ----------------------------------------------------------------------

export function ClassroomProvider({ children }) {
  const wsRef = useRef();
  const reconnectTimeoutRef = useRef();
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const isUnmountingRef = useRef(false);
  const messageHandlersRef = useRef(new Set());
  const [classroomState, setClassroomState] = useState({
    joinCode: 0,
    name: null,
    courseId: null,
    courseName: null,
    courseCode: null,
    joinCheckingModes: null,
  });
  const [studentState, setStudentState] = useState({
    courseId: null,
    studentId: null,
    studentName: null,
    token: null,
    joinedAt: null,
  });
  const [isAuthencated, setIsAuthencated] = useState(false);


  // ----------------------------------------------------------------------
  // Classroom Actions
  // ----------------------------------------------------------------------

  const joinClassroom = useCallback((classroomInfo, studentInfo) => {
    setClassroomState({
      ...classroomInfo,
    });
    setStudentState({
      ...studentInfo,
    });
    setIsAuthencated(true);
    setCookie('classroom_join_token', studentInfo.token, { expires: 1 }); // Expires in 1 day
  }, []);

  const leaveClassroom = useCallback(() => {
    // Stop reconnection attempts
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Close WebSocket
    if (wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)) {
      wsRef.current.close(1000, 'User leaving classroom');
    }

    // Clear all states
    setClassroomState({
      joinCode: 0,
      name: null,
      courseId: null,
      courseName: null,
      courseCode: null,
      joinCheckingModes: null,
    });
    setStudentState({
      courseId: null,
      studentId: null,
      studentName: null,
      token: null,
      joinedAt: null,
    });
    setIsAuthencated(false);

    // Remove cookie
    removeCookie('classroom_join_token');
  }, []);

  const setAuthencated = useCallback((value) => {
    setIsAuthencated(value);
  }, []);

  // Subscribe to WebSocket messages
  const subscribeMessage = useCallback((handler) => {
    if (typeof handler !== 'function') {
      console.error('[WebSocket] Handler must be a function');
      // Return a no-op unsubscribe function
      return () => { };
    }

    messageHandlersRef.current.add(handler);
    console.log(`[WebSocket] Message handler subscribed (Total: ${messageHandlersRef.current.size})`);

    // Return unsubscribe function
    return () => {
      messageHandlersRef.current.delete(handler);
      console.log(`[WebSocket] Message handler unsubscribed (Total: ${messageHandlersRef.current.size})`);
    };
  }, []);

  // Unsubscribe from WebSocket messages (manual)
  const unsubscribeMessage = useCallback((handler) => {
    const deleted = messageHandlersRef.current.delete(handler);
    if (deleted) {
      console.log(`[WebSocket] Message handler unsubscribed (Total: ${messageHandlersRef.current.size})`);
    }
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message - connection not open');
      return false;
    }

    try {
      const messageString = typeof message === 'string'
        ? message
        : JSON.stringify(message);

      wsRef.current.send(messageString);
      console.log('[WebSocket] Message sent:', message);
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      return false;
    }
  }, []);
  // WebSocket connection with reconnect logic
  useEffect(() => {
    if (!isAuthencated || !studentState.token) {
      return;
    }

    const MAX_RECONNECT_ATTEMPTS = 5;
    const BASE_RECONNECT_DELAY = 1000; // 1 second
    const MAX_RECONNECT_DELAY = 30000; // 30 seconds

    // Reset flags when effect starts
    isUnmountingRef.current = false;
    shouldReconnectRef.current = true;

    const connectWebSocket = () => {
      if (isUnmountingRef.current || !shouldReconnectRef.current) {
        console.log('[WebSocket] Connection cancelled - component unmounting or reconnect disabled');
        return;
      }

      try {
        // Convert HTTP/HTTPS to WS/WSS
        const wsProtocol = CONFIG.serverUrl.replace(/^http/, 'ws');

        // Encode the token to handle special characters like +, =, /
        const encodedToken = encodeURIComponent(studentState.token);
        const connectionUrl = `${wsProtocol}/api/RealTimeClass/Connect/${encodedToken}`;

        console.log(`[WebSocket] Connecting... (Attempt ${reconnectAttemptsRef.current + 1})`);

        const ws = new WebSocket(connectionUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WebSocket] Connection established');
          // Reset reconnect attempts on successful connection
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            messageHandlersRef.current.forEach((handler) => handler(data));
          } catch (err) {
            console.log('[WebSocket] Message received (raw):', event.data);
          }
        };

        ws.onclose = (event) => {
          console.log('[WebSocket] Connection closed', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });

          wsRef.current = null;

          // Check if server forced relogin
          if (event.reason === 'FORCE_RELOGIN') {
            console.warn('[WebSocket] Force relogin required - stopping reconnection');
            shouldReconnectRef.current = false;
            // Optionally trigger logout or redirect
            // leaveClassroom();
            return;
          }

          // Don't reconnect if:
          // 1. Component is unmounting
          // 2. Reconnection is disabled (manual close)
          // 3. Max reconnect attempts reached
          if (isUnmountingRef.current || !shouldReconnectRef.current) {
            console.log('[WebSocket] Reconnection disabled');
            return;
          }

          if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            console.error(`[WebSocket] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
            return;
          }

          // Calculate exponential backoff delay
          const delay = Math.min(
            BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
            MAX_RECONNECT_DELAY
          );

          console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        };

        ws.onerror = (error) => {
          console.warn('[WebSocket] Error:', error);
        };

      } catch (error) {
        console.error('[WebSocket] Failed to create connection:', error);
      }
    };

    // Initial connection
    connectWebSocket();

    // Cleanup function
    return () => {
      console.log('[WebSocket] Cleaning up connection...');
      isUnmountingRef.current = true;
      shouldReconnectRef.current = false;

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Close WebSocket
      if (wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [isAuthencated, studentState.token]);

  // ----------------------------------------------------------------------

  const memoizedValue = useMemo(
    () => ({
      // State
      classroomState,
      studentState,
      isAuthencated,
      // Actions
      joinClassroom,
      leaveClassroom,
      setAuthencated,
      subscribeMessage,
      unsubscribeMessage,
      sendMessage,
    }),
    [
      classroomState,
      studentState,
      isAuthencated,
      joinClassroom,
      leaveClassroom,
      setAuthencated,
      subscribeMessage,
      unsubscribeMessage,
      sendMessage,
    ]
  );

  return <ClassroomContext value={memoizedValue}>{children}</ClassroomContext>;
}
