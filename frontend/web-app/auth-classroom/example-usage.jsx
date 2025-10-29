// Example: How to use subscribeMessage in child components

import { useEffect, useState } from 'react';
import { useClassroomContext } from './classroom-context';

// Example 1: Basic usage with cleanup (RECOMMENDED)
export function ClassroomMessageListener() {
  const { subscribeMessage } = useClassroomContext();

  useEffect(() => {
    // Subscribe to messages and return the unsubscribe function directly
    // ✅ When component unmounts, React will call the returned function
    return subscribeMessage((data) => {
      console.log('Received message:', data);

      // Handle different message types
      switch (data.type) {
        case 'broadcast':
          console.log('Broadcast message:', data.payload);
          break;
        case 'notification':
          console.log('Notification:', data.payload);
          break;
        default:
          console.log('Unknown message type:', data);
      }
    });
  }, [subscribeMessage]);

  return <div>Listening to messages...</div>;
}

// Example 2: Component that sends and receives messages
export function ClassroomChat() {
  const { subscribeMessage, sendMessage } = useClassroomContext();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // ✅ Both syntaxes work the same way
    return subscribeMessage((data) => {
      if (data.type === 'chat') {
        setMessages((prev) => [...prev, data.payload]);
      }
    });
  }, [subscribeMessage]);

  const handleSendMessage = (text) => {
    const message = {
      type: 'chat',
      payload: {
        text,
        timestamp: new Date().toISOString(),
      },
    };

    const success = sendMessage(message);
    if (!success) {
      console.error('Failed to send message');
    }
  };

  return (
    <div>
      <div>
        {messages.map((msg, idx) => (
          <div key={idx}>{msg.text}</div>
        ))}
      </div>
      <button onClick={() => handleSendMessage('Hello')}>
        Send Message
      </button>
    </div>
  );
}

// Example 3: Multiple subscribers in the same component
export function ClassroomDashboard() {
  const { subscribeMessage } = useClassroomContext();

  useEffect(() => {
    // Handler 1: For broadcasts
    const unsubscribe1 = subscribeMessage((data) => {
      if (data.type === 'broadcast') {
        console.log('Broadcast:', data.payload);
      }
    });

    // Handler 2: For notifications
    const unsubscribe2 = subscribeMessage((data) => {
      if (data.type === 'notification') {
        alert(data.payload.message);
      }
    });

    // Cleanup both subscriptions
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [subscribeMessage]);

  return <div>Dashboard</div>;
}

// Example 4: Alternative syntax - direct return (single handler only)
export function SimpleListener() {
  const { subscribeMessage } = useClassroomContext();

  useEffect(
    // ✅ subscribeMessage returns the unsubscribe function
    // React will call it on cleanup
    () => subscribeMessage((data) => {
      console.log('Message:', data);
    }),
    [subscribeMessage]
  );

  return <div>Simple Listener</div>;
}

// ❌ Example 5: WRONG - Missing return (memory leak!)
export function WrongListener() {
  const { subscribeMessage } = useClassroomContext();

  useEffect(() => {
    // ❌ WRONG: No return statement!
    // The handler will NEVER be removed from the Set
    subscribeMessage((data) => {
      console.log('Message:', data);
    });
    // Missing: return unsubscribe
  }, [subscribeMessage]);

  return <div>Wrong Listener (Memory Leak!)</div>;
}
