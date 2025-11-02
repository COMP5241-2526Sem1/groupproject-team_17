'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { CONFIG } from 'src/global-config';

import { InstructorWebSocketContext } from './instructor-websocket-context';

// ----------------------------------------------------------------------

/**
 * InstructorWebSocketProvider
 *
 * Provides WebSocket connection management for instructors in the dashboard.
 * Automatically connects to the specified course's WebSocket endpoint and handles
 * reconnection, message broadcasting, and cleanup.
 *
 * @param {Object} props
 * @param {string} props.courseId - The course ID to connect to
 * @param {boolean} props.enabled - Whether WebSocket connection is enabled
 * @param {ReactNode} props.children - Child components
 */
export function InstructorWebSocketProvider({ courseId, enabled = true, children }) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const isUnmountingRef = useRef(false);
  const messageHandlersRef = useRef(new Set());

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  // ----------------------------------------------------------------------
  // WebSocket Actions
  // ----------------------------------------------------------------------

  /**
   * Subscribe to WebSocket messages
   * @param {Function} handler - Callback function to handle messages
   * @returns {Function} Unsubscribe function
   */
  const subscribeMessage = useCallback((handler) => {
    if (typeof handler !== 'function') {
      console.error('[InstructorWS] Handler must be a function');
      return () => { };
    }

    messageHandlersRef.current.add(handler);
    console.log(`[InstructorWS] Message handler subscribed (Total: ${messageHandlersRef.current.size})`);

    // Return unsubscribe function
    return () => {
      messageHandlersRef.current.delete(handler);
      console.log(`[InstructorWS] Message handler unsubscribed (Total: ${messageHandlersRef.current.size})`);
    };
  }, []);

  /**
   * Manually unsubscribe from WebSocket messages
   * @param {Function} handler - The handler to unsubscribe
   */
  const unsubscribeMessage = useCallback((handler) => {
    const deleted = messageHandlersRef.current.delete(handler);
    if (deleted) {
      console.log(`[InstructorWS] Message handler unsubscribed (Total: ${messageHandlersRef.current.size})`);
    }
  }, []);

  /**
   * Send message through WebSocket
   * @param {Object|string} message - Message to send
   * @returns {boolean} Success status
   */
  const sendMessage = useCallback((message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[InstructorWS] Cannot send message - connection not open');
      return false;
    }

    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(messageString);
      console.log('[InstructorWS] Message sent:', message);
      return true;
    } catch (err) {
      console.error('[InstructorWS] Failed to send message:', err);
      return false;
    }
  }, []);

  /**
   * Manually disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)) {
      wsRef.current.close(1000, 'Manual disconnect');
    }

    setIsConnected(false);
  }, []);

  /**
   * Manually reconnect WebSocket
   */
  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;
    disconnect();
    // Connection will be re-established by the effect
  }, [disconnect]);

  // ----------------------------------------------------------------------
  // WebSocket Connection Effect
  // ----------------------------------------------------------------------

  useEffect(() => {
    if (!enabled || !courseId) {
      console.log('[InstructorWS] Connection disabled or no courseId');
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
        console.log('[InstructorWS] Connection cancelled - component unmounting or reconnect disabled');
        return;
      }

      // Prevent connecting if there's already an active connection
      if (wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)) {
        console.log('[InstructorWS] Connection already exists, skipping...');
        return;
      }

      try {
        // Convert HTTP/HTTPS to WS/WSS
        const wsProtocol = CONFIG.serverUrl.replace(/^http/, 'ws');
        const connectionUrl = `${wsProtocol}/api/RealTimeClass/ConnectInstructor/${courseId}`;

        console.log(`[InstructorWS] Connecting to course ${courseId}... (Attempt ${reconnectAttemptsRef.current + 1})`);

        const ws = new WebSocket(connectionUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[InstructorWS] Connection established');
          setIsConnected(true);
          setError(null);
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[InstructorWS] Message received:', data);
            setLastMessage(data);

            // Broadcast to all subscribed handlers
            messageHandlersRef.current.forEach((handler) => {
              try {
                handler(data);
              } catch (err) {
                console.error('[InstructorWS] Handler error:', err);
              }
            });
          } catch (err) {
            console.log('[InstructorWS] Message received (raw):', event.data);
            setLastMessage(event.data);
          }
        };

        ws.onclose = (event) => {
          console.log('[InstructorWS] Connection closed', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });

          wsRef.current = null;
          setIsConnected(false);

          // Check for specific close reasons
          if (event.reason === 'COURSE_NOT_FOUND' || event.reason === 'UNAUTHORIZED') {
            console.error(`[InstructorWS] ${event.reason} - stopping reconnection`);
            shouldReconnectRef.current = false;
            setError(event.reason);
            return;
          }

          // Don't reconnect if:
          // 1. Component is unmounting (includes React StrictMode double-invoke cleanup)
          // 2. Reconnection is disabled (manual close)
          // 3. Max reconnect attempts reached
          // 4. Connection was closed cleanly (code 1000) - likely manual disconnect or StrictMode cleanup
          if (isUnmountingRef.current || !shouldReconnectRef.current || event.code === 1000) {
            console.log('[InstructorWS] Reconnection disabled or clean close');
            return;
          }

          if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            console.error(`[InstructorWS] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
            setError('Max reconnection attempts reached');
            return;
          }

          // Calculate exponential backoff delay
          const delay = Math.min(
            BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
            MAX_RECONNECT_DELAY
          );

          console.log(`[InstructorWS] Reconnecting in ${delay}ms...`);
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        };

        ws.onerror = (err) => {
          console.error('[InstructorWS] WebSocket error:', err);
          setError('WebSocket connection error');
        };
      } catch (err) {
        console.error('[InstructorWS] Failed to create connection:', err);
        setError(err.message);
      }
    };

    // Initial connection
    connectWebSocket();

    // Cleanup function
    return () => {
      console.log('[InstructorWS] Cleaning up connection...');
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

      // Clear all message handlers
      messageHandlersRef.current.clear();
    };
  }, [enabled, courseId]);

  // ----------------------------------------------------------------------

  const memoizedValue = useMemo(
    () => ({
      // State
      isConnected,
      lastMessage,
      error,
      courseId,
      // Actions
      subscribeMessage,
      unsubscribeMessage,
      sendMessage,
      disconnect,
      reconnect,
    }),
    [
      isConnected,
      lastMessage,
      error,
      courseId,
      subscribeMessage,
      unsubscribeMessage,
      sendMessage,
      disconnect,
      reconnect,
    ]
  );

  return (
    <InstructorWebSocketContext value={memoizedValue}>
      {children}
    </InstructorWebSocketContext>
  );
}
