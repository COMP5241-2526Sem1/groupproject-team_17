import { Box, Button, CircularProgress, Paper, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { aiAssistantAPI } from '../api/api-function-call';

/**
 * Example component showing typewriter effect with AI streaming
 */
export default function AITypewriterExample({ conversationId }) {
  const [message, setMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activityData, setActivityData] = useState(null);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsStreaming(true);
    setAiResponse('');
    setActivityData(null);

    try {
      // Use streaming API for typewriter effect
      await aiAssistantAPI.sendMessageStream(
        {
          conversationId: conversationId,
          message: message,
          pdfContent: null,
        },
        // onChunk - called for each chunk of text
        (chunk) => {
          if (typeof chunk === 'string') {
            // Text content chunk - append to response
            setAiResponse((prev) => prev + chunk);
          } else if (chunk.type === 'function_call') {
            // Function call detected
            console.log('Function called:', chunk.data.function_name);
            setActivityData(chunk.data.activity_data);
          }
        },
        // onComplete - called when streaming finishes
        (result) => {
          console.log('Streaming complete:', result);
          setIsStreaming(false);
          if (result.has_activity_data) {
            setAiResponse(result.message);
          }
        },
        // onError - called on error
        (error) => {
          console.error('Streaming error:', error);
          setIsStreaming(false);
          setAiResponse('Error: ' + error);
        }
      );

      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsStreaming(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        AI Assistant with Typewriter Effect
      </Typography>

      {/* AI Response Display */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          minHeight: 200,
          bgcolor: 'grey.50',
          position: 'relative',
        }}
      >
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {aiResponse}
          {isStreaming && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 2,
                height: 20,
                bgcolor: 'primary.main',
                ml: 0.5,
                animation: 'blink 1s infinite',
                '@keyframes blink': {
                  '0%, 49%': { opacity: 1 },
                  '50%, 100%': { opacity: 0 },
                },
              }}
            />
          )}
        </Typography>

        {isStreaming && (
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
            <CircularProgress size={20} />
          </Box>
        )}
      </Paper>

      {/* Activity Data Preview */}
      {activityData && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light' }}>
          <Typography variant="subtitle2" gutterBottom>
            Activity Generated:
          </Typography>
          <Typography variant="body2" component="pre" sx={{ overflow: 'auto' }}>
            {JSON.stringify(activityData, null, 2)}
          </Typography>
        </Paper>
      )}

      {/* Input Field */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message to AI assistant..."
          disabled={isStreaming}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <Button
          variant="contained"
          onClick={handleSendMessage}
          disabled={isStreaming || !message.trim()}
          sx={{ minWidth: 100 }}
        >
          {isStreaming ? 'Sending...' : 'Send'}
        </Button>
      </Box>
    </Box>
  );
}

/**
 * Usage Example:
 *
 * import AITypewriterExample from './components/ai-typewriter-example';
 *
 * function MyPage() {
 *   const [conversationId, setConversationId] = useState(null);
 *
 *   // Create conversation first
 *   const createConversation = async () => {
 *     const { data } = await aiAssistantAPI.createConversation({
 *       courseId: 'course-123',
 *       activityType: 'quiz',
 *       title: 'Quiz Generation'
 *     });
 *     setConversationId(data.id);
 *   };
 *
 *   return conversationId ? (
 *     <AITypewriterExample conversationId={conversationId} />
 *   ) : (
 *     <Button onClick={createConversation}>Start Conversation</Button>
 *   );
 * }
 */
