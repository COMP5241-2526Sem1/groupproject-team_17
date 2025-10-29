# Instructor WebSocket Context

A React context provider for managing WebSocket connections for instructors in the course dashboard.

## Overview

The `InstructorWebSocketProvider` provides a centralized WebSocket connection management system similar to `classroom-provider.jsx` but specifically designed for instructors. It automatically:

- Connects to the course-specific WebSocket endpoint
- Handles reconnection with exponential backoff
- Broadcasts messages to all subscribed components
- Cleans up connections on unmount

## File Structure

```
src/contexts/
├── index.js                              # Export file
├── instructor-websocket-context.jsx      # Context definition and hook
└── instructor-websocket-provider.jsx     # Provider implementation
```

## Setup

### 1. Wrap your layout with the provider

The provider is already wrapped in `/app/dashboard/courses/[id]/layout.jsx`:

```jsx
import { InstructorWebSocketProvider } from 'src/contexts/instructor-websocket-provider';

export default function CourseLayout({ children }) {
  const params = useParams();
  const courseId = params?.id;

  return (
    <InstructorWebSocketProvider courseId={courseId} enabled={!!courseId}>
      {children}
    </InstructorWebSocketProvider>
  );
}
```

### 2. Use the hook in your components

```jsx
import { useInstructorWebSocket } from 'src/contexts';

function MyComponent() {
  const { isConnected, subscribeMessage, sendMessage } = useInstructorWebSocket();

  useEffect(() => {
    const handleMessage = (message) => {
      console.log('Received:', message);

      if (message.Type === 'ACTIVITY_CREATED') {
        // Handle activity created
      }
    };

    const unsubscribe = subscribeMessage(handleMessage);
    return () => unsubscribe();
  }, [subscribeMessage]);

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
}
```

## API Reference

### Context Values

#### State
- `isConnected` (boolean) - WebSocket connection status
- `lastMessage` (object|string) - Last received message
- `error` (string|null) - Connection error if any
- `courseId` (string) - Current course ID

#### Methods

##### `subscribeMessage(handler)`
Subscribe to WebSocket messages.

**Parameters:**
- `handler` (Function) - Callback function that receives messages

**Returns:**
- `Function` - Unsubscribe function

**Example:**
```jsx
useEffect(() => {
  const unsubscribe = subscribeMessage((message) => {
    console.log('Message:', message);
  });

  return () => unsubscribe();
}, [subscribeMessage]);
```

##### `unsubscribeMessage(handler)`
Manually unsubscribe a message handler.

**Parameters:**
- `handler` (Function) - The handler to unsubscribe

##### `sendMessage(message)`
Send a message through WebSocket.

**Parameters:**
- `message` (Object|string) - Message to send

**Returns:**
- `boolean` - Success status

**Example:**
```jsx
const success = sendMessage({
  type: 'START_ACTIVITY',
  activityId: '123'
});
```

##### `disconnect()`
Manually disconnect the WebSocket.

##### `reconnect()`
Manually trigger a reconnection.

## Message Types

The WebSocket server sends messages with the following structure:

```javascript
{
  code: 0,           // 0 = success
  Type: "MESSAGE_TYPE",
  Payload: { ... }   // Message-specific data
}
```

### Supported Message Types

1. **CONNECTED** - Initial connection confirmation
   ```javascript
   {
     code: 0,
     Type: "CONNECTED",
     Payload: {
       message: "Instructor connected successfully",
       courseId: "course-123",
       activeStudents: 25,
       courseName: "Math 101"
     }
   }
   ```

2. **ACTIVITY_CREATED** - New activity created
   ```javascript
   {
     code: 0,
     Type: "ACTIVITY_CREATED",
     Payload: {
       activityId: "act-456",
       activityType: "Quiz",
       title: "Midterm Quiz",
       isActive: true,
       ...
     }
   }
   ```

3. **ACTIVITY_UPDATED** - Activity updated
4. **ACTIVITY_DELETED** - Activity deleted
5. **ACTIVITY_DEACTIVATED** - Activity deactivated
6. **NEW_SUBMISSION** - New student submission

## Features

### Auto-Reconnection
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Maximum 5 reconnection attempts
- Maximum delay capped at 30 seconds

### Error Handling
- `COURSE_NOT_FOUND` - Stops reconnection
- `UNAUTHORIZED` - Stops reconnection
- Network errors - Triggers reconnection

### Cleanup
- Automatically closes connection on unmount
- Clears all message handlers
- Cancels pending reconnection attempts

## Example: Classroom Component

```jsx
export default function CourseDetailsClassroom() {
  const { isConnected, subscribeMessage } = useInstructorWebSocket();
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const handleMessage = (message) => {
      switch (message.Type) {
        case 'ACTIVITY_CREATED':
          // Refetch activities
          fetchActivities();
          break;

        case 'ACTIVITY_DELETED':
          // Remove from list
          setActivities(prev =>
            prev.filter(a => a.id !== message.Payload.activityId)
          );
          break;
      }
    };

    const unsubscribe = subscribeMessage(handleMessage);
    return () => unsubscribe();
  }, [subscribeMessage]);

  return (
    <div>
      <StatusChip
        label={isConnected ? 'Connected' : 'Disconnected'}
        color={isConnected ? 'success' : 'error'}
      />
      {/* Rest of component */}
    </div>
  );
}
```

## Differences from classroom-provider.jsx

| Feature | classroom-provider | instructor-websocket-provider |
|---------|-------------------|-------------------------------|
| **Purpose** | Student classroom connection | Instructor dashboard connection |
| **Authentication** | Token-based (student token) | Course ID-based (with authorization) |
| **Endpoint** | `/api/RealTimeClass/Connect/{token}` | `/api/RealTimeClass/ConnectInstructor/{courseId}` |
| **Scope** | Global (entire app) | Scoped to course pages |
| **State Management** | Manages classroom & student state | Only manages WebSocket state |
| **Layout** | Wraps `/classroom` routes | Wraps `/dashboard/courses/[id]` routes |

## Debugging

Enable WebSocket logs in console by searching for `[InstructorWS]`:

```javascript
// Look for these log messages:
[InstructorWS] Connecting to course...
[InstructorWS] Connection established
[InstructorWS] Message received: {...}
[InstructorWS] Message handler subscribed (Total: 1)
[InstructorWS] Reconnecting in 2000ms...
```
