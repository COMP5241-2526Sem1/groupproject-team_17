'use client';

import { useEffect, useRef, useState } from 'react';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha
} from '@mui/material';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { aiAssistantAPI } from 'src/api/api-function-call';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function AIAssistantDialog({ open, onClose, courseId, activityType, onActivityGenerated }) {
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [activityPreviews, setActivityPreviews] = useState([]); // All previews
  const [currentPreviewId, setCurrentPreviewId] = useState(null); // Currently selected preview
  const [showHistory, setShowHistory] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showActivityPreview, setShowActivityPreview] = useState(false);
  const [thinkingDots, setThinkingDots] = useState('.');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Animate thinking dots
  useEffect(() => {
    // Only animate when there's a streaming message
    const hasStreamingMessage = messages.some(msg => msg.isStreaming);

    if (!hasStreamingMessage) {
      setThinkingDots('.');
      return;
    }

    const interval = setInterval(() => {
      setThinkingDots(prev => {
        if (prev === '') return '.';
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        if (prev === '...') return '';

        return '.';
      });
    }, 500); // Change every 500ms

    return () => clearInterval(interval);
  }, [messages]);

  useEffect(() => {
    if (open && courseId && activityType) {
      loadConversationHistory();
    }
  }, [open, courseId, activityType]);

  const loadConversationHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await aiAssistantAPI.getMyConversations(courseId, true); // true = include completed conversations

      if (response.code === 0 && response.data) {
        const filtered = response.data.filter(conv =>
          conv.activityType === activityType && conv.courseId === courseId
        );
        setConversations(filtered);

        if (filtered.length === 0) {
          // No conversations, create new one
          setShowHistory(false);
          await initializeConversation();
        } else {
          // Has conversations, automatically load the most recent one
          const latestConversation = filtered[0]; // Conversations are sorted by UpdatedAt desc
          await loadConversation(latestConversation.id);
          setShowHistory(false); // Don't show history view, show chat directly
        }
      } else {
        setShowHistory(false);
        await initializeConversation();
      }
    } catch (err) {
      console.error('Error loading conversation history:', err);
      setShowHistory(false);
      await initializeConversation();
    } finally {
      setIsLoadingHistory(false);
    }
  }; const initializeConversation = async () => {
    if (conversationId) return;

    try {
      setIsInitializing(true);
      setError(null);

      const response = await aiAssistantAPI.createConversation({
        courseId: courseId,
        activityType: activityType,
        title: `${activityType} - ${new Date().toLocaleDateString()}`,
      });

      if (response.code === 0 && response.data) {
        setConversationId(response.data.id);
        setMessages([]);
        setActivityData(null);
        setShowActivityPreview(false);

        const updatedConversations = await aiAssistantAPI.getMyConversations(courseId, false);
        if (updatedConversations.code === 0 && updatedConversations.data) {
          const filtered = updatedConversations.data.filter(conv =>
            conv.activityType === activityType && conv.courseId === courseId
          );
          setConversations(filtered);
        }
      } else {
        setError('Failed to initialize conversation');
      }
    } catch (err) {
      console.error('Error initializing conversation:', err);
      setError('Failed to initialize AI Assistant');
    } finally {
      setIsInitializing(false);
    }
  };

  const loadConversation = async (convId) => {
    try {
      setIsInitializing(true);
      setError(null);

      const response = await aiAssistantAPI.getConversation(convId);

      if (response.code === 0 && response.data) {
        setConversationId(convId);
        const conv = response.data;

        // Convert messages to display format
        const loadedMessages = (conv.messages || []).map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          order: msg.order,
        }));

        // Load activity previews from backend
        const previews = conv.activityPreviews || [];
        setActivityPreviews(previews);

        console.log('[AI Assistant] Loaded previews:', previews);

        // Map previews to messages using message ID
        // Each preview has a messageId field that links to the assistant message
        loadedMessages.forEach((msg) => {
          // Find preview associated with this message by ID
          const preview = previews.find(p => p.messageId === msg.id);
          if (preview) {
            msg.hasActivityData = true;
            // Add type field and isCreated status to activityData if they don't exist
            msg.activityData = {
              ...(preview.activityData || {}),
              type: preview.activityData?.type || preview.activityType || conv.activityType,
              isCreated: preview.isCreated || false
            };
            msg.previewId = preview.id;
            console.log('[AI Assistant] Mapped preview to message:', {
              messageId: msg.id,
              previewId: preview.id,
              activityData: msg.activityData,
              isCreated: preview.isCreated
            });
          }
        });

        setMessages(loadedMessages);

        // If there are previews, set the most recent one as active (unless already created)
        if (previews.length > 0) {
          const latestPreview = previews[previews.length - 1];
          if (!latestPreview.isCreated) {
            // Add type field and isCreated status to activityData
            const activityDataWithType = {
              ...(latestPreview.activityData || {}),
              type: latestPreview.activityData?.type || latestPreview.activityType || conv.activityType,
              isCreated: latestPreview.isCreated || false
            };
            setActivityData(activityDataWithType);
            setCurrentPreviewId(latestPreview.id);
          }
        } else {
          setActivityData(null);
          setCurrentPreviewId(null);
        }

        setShowHistory(false);
        setShowActivityPreview(false);
      } else {
        setError('Failed to load conversation');
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming || !conversationId) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError(null);

    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);

    const newAssistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, newAssistantMessage]);
    setIsStreaming(true);

    try {
      await aiAssistantAPI.sendMessageStream(
        {
          conversationId: conversationId,
          message: userMessage,
          pdfContent: null,
        },
        (chunk) => {
          if (typeof chunk === 'string') {
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.content += chunk;
              }
              return updated;
            });
          } else if (chunk && typeof chunk === 'object' && chunk.type === 'status') {
            // Handle status messages (e.g., "Searching for activities...")
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                // Append status message with special formatting
                const statusText = `\n\n*${chunk.message}*`;
                lastMsg.content += statusText;
              }
              return updated;
            });
          } else if (chunk && typeof chunk === 'object' && chunk.type === 'activity_selection') {
            // Handle activity selection - show card list for user to choose
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                lastMsg.activitySelection = {
                  message: chunk.message,
                  activities: chunk.activities
                };
              }
              return updated;
            });
          } else if (chunk && typeof chunk === 'object' && chunk.type === 'function_call') {
            try {
              // chunk.data contains the parsed function call data
              const activityContent = chunk.data?.activity_data || chunk.data;
              const previewId = chunk.data?.preview_id;
              const functionName = chunk.data?.function_name;

              // Infer actual activity type from function name instead of using conversation's activityType
              let actualActivityType = activityType; // fallback to conversation type
              if (functionName) {
                if (functionName.includes('quiz')) {
                  actualActivityType = 'quiz';
                } else if (functionName.includes('poll')) {
                  actualActivityType = 'poll';
                } else if (functionName.includes('discussion')) {
                  actualActivityType = 'discussion';
                }
              }

              console.log('[AI Assistant] Function call detected:', {
                functionName,
                conversationActivityType: activityType,
                inferredActivityType: actualActivityType
              });

              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.hasActivityData = true;
                  lastMsg.activityData = { ...activityContent, type: actualActivityType, isCreated: false };
                  lastMsg.previewId = previewId;
                }
                return updated;
              });

              setActivityData({ ...activityContent, type: actualActivityType, isCreated: false });
              if (previewId) {
                setCurrentPreviewId(previewId);
                // Also add to activityPreviews if not already there
                setActivityPreviews(prev => {
                  const exists = prev.some(p => p.id === previewId);
                  if (!exists) {
                    return [...prev, {
                      id: previewId,
                      activityType: actualActivityType,
                      activityData: { ...activityContent, type: actualActivityType },
                      isCreated: false
                    }];
                  }
                  return prev;
                });
              }
            } catch (err) {
              console.error('Error parsing function call:', err);
            }
          }
        },
        (result) => {
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.isStreaming = false;
              // Extract message from result object if it's an object, otherwise use the result directly
              if (lastMsg.content === '' && !lastMsg.hasActivityData) {
                const messageContent = typeof result === 'object' && result?.message
                  ? result.message
                  : (typeof result === 'string' ? result : 'Response received');
                lastMsg.content = messageContent;
              }
            }
            return updated;
          });
          setIsStreaming(false);
        },
        (errorMsg) => {
          setError(errorMsg);
          setMessages(prev => prev.slice(0, -1));
          setIsStreaming(false);
        }
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      setMessages(prev => prev.slice(0, -1));
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateActivity = async () => {
    if (!activityData) return;

    try {
      // Check if current preview is already created
      if (currentPreviewId) {
        const currentPreview = activityPreviews.find(p => p.id === currentPreviewId);
        console.log('[Create Activity] Checking preview status:', {
          currentPreviewId,
          currentPreview,
          isCreated: currentPreview?.isCreated
        });

        if (currentPreview && currentPreview.isCreated) {
          setError('This activity has already been created');
          return;
        }
      }

      console.log('[Create Activity] Starting activity creation...');

      // First complete the conversation and create the activity in the backend
      if (conversationId) {
        await aiAssistantAPI.completeConversation({
          conversationId: conversationId,
          previewId: currentPreviewId,
          activityData: activityData,
        });
      }

      console.log('[Create Activity] Backend creation completed, updating local state...');

      // Update the preview's isCreated status in local state
      if (currentPreviewId) {
        setActivityPreviews(prev => {
          const updated = prev.map(p =>
            p.id === currentPreviewId ? { ...p, isCreated: true } : p
          );
          console.log('[Create Activity] Updated activityPreviews:', updated);
          return updated;
        });

        // Also update the message's activity data
        setMessages(prev => prev.map(msg =>
          msg.previewId === currentPreviewId
            ? { ...msg, activityData: { ...msg.activityData, isCreated: true } }
            : msg
        ));

        // Update the current activityData to mark it as created
        setActivityData(prev => {
          const updated = { ...prev, isCreated: true };
          console.log('[Create Activity] Updated activityData:', updated);
          return updated;
        });
      }

      // Notify parent to refresh the activities list
      if (onActivityGenerated) {
        await onActivityGenerated(activityData);
      }

      console.log('[Create Activity] Activity creation completed successfully');

      // Stay in the conversation view instead of closing
      setShowActivityPreview(false);

      // Show success message briefly
      setError(null);

    } catch (err) {
      console.error('Error creating activity:', err);
      setError(err.response?.data?.message || 'Failed to create activity');
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInputMessage('');
    setActivityData(null);
    setActivityPreviews([]);
    setCurrentPreviewId(null);
    setConversationId(null);
    setError(null);
    setShowHistory(false);
    setShowActivityPreview(false);
    setCurrentQuestionIndex(0);
    if (onClose) onClose();
  };

  const handleStartNewConversation = async () => {
    await initializeConversation();
    setShowHistory(false);
  };

  const handleBackToHistory = () => {
    setShowHistory(true);
    setMessages([]);
    setConversationId(null);
    setActivityData(null);
    setActivityPreviews([]);
    setCurrentPreviewId(null);
    setShowActivityPreview(false);
  };

  const handleDeleteConversation = async (deletedConvId, event) => {
    // Prevent card click event from triggering
    event.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await aiAssistantAPI.deleteConversation(deletedConvId);

      // Refresh conversations list and stay in history view
      const response = await aiAssistantAPI.getMyConversations(courseId, true);
      if (response.code === 0 && response.data) {
        const filtered = response.data.filter(conv =>
          conv.activityType === activityType && conv.courseId === courseId
        );
        setConversations(filtered);
      }

      // If the deleted conversation was the current one, clear it and show history
      if (deletedConvId === conversationId) {
        setMessages([]);
        setConversationId(null);
        setActivityData(null);
        setActivityPreviews([]);
        setCurrentPreviewId(null);
        setShowActivityPreview(false);
        setShowHistory(true); // Show history view instead of loading another conversation
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Failed to delete conversation');
    }
  };

  const renderHistoryView = () => (
    <Stack sx={{ flex: 1, bgcolor: 'background.default', p: 3, overflow: 'auto' }} spacing={2}>
      <Button
        variant="contained"
        fullWidth
        startIcon={<Iconify icon="solar:add-circle-bold" />}
        onClick={handleStartNewConversation}
        sx={{
          py: 1.5,
          borderRadius: 2,
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 600,
        }}
      >
        Start New Conversation
      </Button>

      <Divider />

      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        Previous Conversations
      </Typography>

      {conversations.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No previous conversations found
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {conversations.map((conv) => (
            <Card
              key={conv.id}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)',
                },
              }}
              onClick={() => loadConversation(conv.id)}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack spacing={1} sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Iconify icon="solar:calendar-bold-duotone" width={20} sx={{ color: 'primary.main' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {(() => {
                          const date = new Date(conv.updatedAt);
                          return date.toLocaleString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          });
                        })()}
                      </Typography>
                    </Stack>

                  </Stack>
                  <Tooltip title="Delete Conversation">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      sx={{
                        color: 'error.main',
                        '&:hover': {
                          bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                        },
                      }}
                    >
                      <Iconify icon="solar:trash-bin-trash-bold" width={20} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );

  const getActivityTypeLabel = () => {
    switch (activityType) {
      case 'quiz': return 'Quiz';
      case 'poll': return 'Poll';
      case 'discussion': return 'Discussion';
      default: return 'Activity';
    }
  };

  const getActivityTypeColor = () => {
    switch (activityType) {
      case 'quiz': return 'primary';
      case 'poll': return 'info';
      case 'discussion': return 'success';
      default: return 'default';
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.default',
            height: '85vh',
          },
        }}
      >
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box
            sx={{
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              color: 'white',
              p: 3,
              flexShrink: 0,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={2}>
                {conversationId && !showHistory && (
                  <Tooltip title="Back to History">
                    <IconButton onClick={handleBackToHistory} sx={{ color: 'white' }}>
                      <Iconify icon="solar:arrow-left-bold" width={24} />
                    </IconButton>
                  </Tooltip>
                )}
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    AI Assistant
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    {isStreaming && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: 'success.light',
                            animation: 'pulse 1.5s ease-in-out infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.5 },
                            },
                          }}
                        />
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                          AI is typing...
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </Stack>
              <Tooltip title="Close">
                <IconButton onClick={handleClose} sx={{ color: 'text.secondary' }}>
                  <Iconify icon="solar:close-circle-bold" width={24} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Main Content Area */}
          {showHistory ? (
            renderHistoryView()
          ) : isInitializing ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, bgcolor: 'background.default' }}>
              <Stack alignItems="center" spacing={2}>
                <CircularProgress size={48} thickness={4} />
                <Typography variant="body2" color="text.secondary">
                  {conversationId ? 'Loading conversation...' : 'Initializing AI Assistant...'}
                </Typography>
              </Stack>
            </Box>
          ) : conversationId ? (
            <Stack sx={{ flex: 1, bgcolor: 'background.default', overflow: 'hidden', display: 'flex' }}>
              {/* Activity Preview (Full Screen) or Chat Messages */}
              {showActivityPreview && activityData ? (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    p: 3,
                    minHeight: 0,
                    overflow: 'hidden',
                  }}
                >
                  <Card
                    elevation={0}
                    sx={{
                      flex: 1,
                      border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                      bgcolor: (theme) => alpha(theme.palette.success.lighter, 0.08),
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                      <Stack spacing={3} sx={{ height: '100%' }}>
                        {/* Header with Back Button */}
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 1.5,
                                bgcolor: (() => {
                                  const currentPreview = activityPreviews.find(p => p.id === currentPreviewId);
                                  return currentPreview?.isCreated ? 'grey.500' : 'success.main';
                                })(),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Iconify
                                icon={(() => {
                                  const currentPreview = activityPreviews.find(p => p.id === currentPreviewId);
                                  return currentPreview?.isCreated
                                    ? "solar:check-circle-bold-duotone"
                                    : "solar:document-add-bold-duotone";
                                })()}
                                width={24}
                                sx={{ color: 'white' }}
                              />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" sx={{
                                fontWeight: 600, color: (() => {
                                  const currentPreview = activityPreviews.find(p => p.id === currentPreviewId);
                                  return currentPreview?.isCreated ? 'text.secondary' : 'success.darker';
                                })()
                              }}>
                                {(() => {
                                  const currentPreview = activityPreviews.find(p => p.id === currentPreviewId);
                                  return currentPreview?.isCreated ? 'Activity Already Created' : 'Activity Ready to Create';
                                })()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {activityData.title || 'Untitled Activity'}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="outlined"
                              startIcon={<Iconify icon="solar:arrow-left-line-duotone" />}
                              onClick={() => {
                                setShowActivityPreview(false);
                                setCurrentQuestionIndex(0);
                              }}
                              sx={{
                                borderRadius: 1.5,
                                textTransform: 'none',
                                fontWeight: 600,
                                borderColor: 'text.secondary',
                                color: 'text.secondary',
                                '&:hover': {
                                  borderColor: 'text.primary',
                                  bgcolor: 'action.hover',
                                },
                              }}
                            >
                              Back to Conversation
                            </Button>
                            {(() => {
                              const currentPreview = activityPreviews.find(p => p.id === currentPreviewId);
                              const isCreated = currentPreview?.isCreated || activityData?.isCreated;

                              console.log('[Activity Preview Button] Render state:', {
                                currentPreviewId,
                                currentPreview,
                                activityData,
                                isCreated
                              });

                              if (isCreated) {
                                return (
                                  <Chip
                                    label="Already Created"
                                    color="default"
                                    sx={{
                                      height: 36,
                                      borderRadius: 1.5,
                                      fontWeight: 600,
                                    }}
                                  />
                                );
                              }
                              return (
                                <Button
                                  variant="contained"
                                  color="success"
                                  startIcon={<Iconify icon="solar:check-circle-bold" />}
                                  onClick={handleCreateActivity}
                                  sx={{
                                    borderRadius: 1.5,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    boxShadow: (theme) => `0 8px 16px ${alpha(theme.palette.success.main, 0.24)}`,
                                  }}
                                >
                                  Create Activity
                                </Button>
                              );
                            })()}
                          </Stack>
                        </Stack>

                        <Divider />

                        {/* Activity Content Preview - Scrollable */}
                        <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                          {(() => {
                            console.log('[Activity Preview] Current activityData:', activityData);

                            if (!activityData) {
                              return (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                  <Typography color="text.secondary">No activity data available</Typography>
                                </Box>
                              );
                            }

                            // Normalize type to handle both uppercase and lowercase
                            const normalizedType = activityData.type?.toLowerCase();
                            const activityType = normalizedType === 'polling' ? 'poll' : normalizedType;

                            console.log('[Activity Preview] Normalized type:', {
                              original: activityData.type,
                              normalized: normalizedType,
                              activityType,
                              hasQuestions: !!activityData.questions,
                              questionsLength: activityData.questions?.length
                            });

                            if (activityType === 'quiz') {
                              const questions = activityData.questions || [];

                              if (questions.length === 0) {
                                return (
                                  <Paper
                                    elevation={0}
                                    sx={{
                                      p: 3,
                                      bgcolor: 'background.paper',
                                      border: (theme) => `1px solid ${theme.palette.divider}`,
                                      borderRadius: 2,
                                    }}
                                  >
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                      {activityData.title}
                                    </Typography>
                                    {activityData.description && (
                                      <Typography variant="body2" color="text.secondary">
                                        {activityData.description}
                                      </Typography>
                                    )}
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                      No questions available for this quiz yet.
                                    </Alert>
                                  </Paper>
                                );
                              }

                              return (
                                <Stack spacing={3}>
                                  <Paper
                                    elevation={0}
                                    sx={{
                                      p: 3,
                                      bgcolor: 'background.paper',
                                      border: (theme) => `1px solid ${theme.palette.divider}`,
                                      borderRadius: 2,
                                    }}
                                  >
                                    <Stack spacing={2}>
                                      {/* Navigation Dots */}
                                      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                                        {questions.map((_, index) => (
                                          <Box
                                            key={index}
                                            onClick={() => setCurrentQuestionIndex(index)}
                                            sx={{
                                              width: currentQuestionIndex === index ? 32 : 8,
                                              height: 8,
                                              borderRadius: 1,
                                              bgcolor: currentQuestionIndex === index ? 'primary.main' : 'action.disabled',
                                              cursor: 'pointer',
                                              transition: 'all 0.3s ease',
                                              '&:hover': {
                                                bgcolor: currentQuestionIndex === index ? 'primary.dark' : 'action.hover',
                                              },
                                            }}
                                          />
                                        ))}
                                      </Stack>

                                      {/* Current Question */}
                                      <Box>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                                          <Chip
                                            label={`Question ${currentQuestionIndex + 1} of ${questions.length}`}
                                            size="small"
                                            color="primary"
                                            sx={{ fontWeight: 600 }}
                                          />
                                          <Typography variant="caption" color="text.secondary">
                                            Points: {questions[currentQuestionIndex].points || 1}
                                          </Typography>
                                        </Stack>

                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                          {questions[currentQuestionIndex].text}
                                        </Typography>                                    <Stack spacing={1.5}>
                                          {questions[currentQuestionIndex].options.map((option, optionIndex) => {
                                            const isCorrect = optionIndex === questions[currentQuestionIndex].correctAnswer;
                                            const optionLabel = String.fromCharCode(65 + optionIndex);

                                            return (
                                              <Paper
                                                key={optionIndex}
                                                elevation={0}
                                                sx={{
                                                  p: 2,
                                                  border: (theme) => `2px solid ${isCorrect ? theme.palette.success.main : theme.palette.divider}`,
                                                  bgcolor: (theme) => isCorrect ? alpha(theme.palette.success.main, 0.08) : 'transparent',
                                                  borderRadius: 1.5,
                                                  transition: 'all 0.2s ease',
                                                }}
                                              >
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                  <Chip
                                                    label={optionLabel}
                                                    size="small"
                                                    sx={{
                                                      bgcolor: isCorrect ? 'success.main' : 'action.hover',
                                                      color: isCorrect ? 'white' : 'text.secondary',
                                                      fontWeight: 600,
                                                      minWidth: 32,
                                                    }}
                                                  />
                                                  <Typography
                                                    variant="body2"
                                                    sx={{
                                                      color: isCorrect ? 'success.darker' : 'text.primary',
                                                      fontWeight: isCorrect ? 600 : 400,
                                                    }}
                                                  >
                                                    {option}
                                                  </Typography>
                                                  {isCorrect && (
                                                    <Iconify icon="solar:check-circle-bold" width={20} sx={{ color: 'success.main', ml: 'auto' }} />
                                                  )}
                                                </Stack>
                                              </Paper>
                                            );
                                          })}
                                        </Stack>
                                      </Box>

                                      {/* Navigation Buttons */}
                                      <Stack direction="row" spacing={2} justifyContent="space-between" mt={2}>
                                        <Button
                                          variant="outlined"
                                          startIcon={<Iconify icon="solar:arrow-left-line-duotone" />}
                                          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                                          disabled={currentQuestionIndex === 0}
                                          sx={{ flex: 1 }}
                                        >
                                          Previous
                                        </Button>
                                        <Button
                                          variant="outlined"
                                          endIcon={<Iconify icon="solar:arrow-right-line-duotone" />}
                                          onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                                          disabled={currentQuestionIndex === questions.length - 1}
                                          sx={{ flex: 1 }}
                                        >
                                          Next
                                        </Button>
                                      </Stack>
                                    </Stack>
                                  </Paper>
                                </Stack>
                              );
                            }

                            // Poll type
                            if (activityType === 'poll') {
                              const options = activityData.options || [];

                              return (
                                <Paper
                                  elevation={0}
                                  sx={{
                                    p: 3,
                                    bgcolor: 'background.paper',
                                    border: (theme) => `1px solid ${theme.palette.divider}`,
                                    borderRadius: 2,
                                  }}
                                >
                                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                    {activityData.title}
                                  </Typography>
                                  {activityData.description && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                      {activityData.description}
                                    </Typography>
                                  )}

                                  <Divider sx={{ my: 2 }} />

                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                                    Poll Options:
                                  </Typography>
                                  {options.length === 0 ? (
                                    <Alert severity="info">
                                      No poll options available yet.
                                    </Alert>
                                  ) : (
                                    <Stack spacing={1}>
                                      {options.map((option, index) => {
                                        const optionText = typeof option === 'string' ? option : option.text;
                                        return (
                                          <Paper
                                            key={index}
                                            elevation={0}
                                            sx={{
                                              p: 1.5,
                                              border: (theme) => `1px solid ${theme.palette.divider}`,
                                              borderRadius: 1,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 1,
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                border: (theme) => `2px solid ${theme.palette.divider}`,
                                                flexShrink: 0,
                                              }}
                                            />
                                            <Typography variant="body2">{optionText}</Typography>
                                          </Paper>
                                        );
                                      })}
                                    </Stack>
                                  )}

                                  {activityData.allowMultipleSelections && (
                                    <Chip
                                      label="Multiple Selections Allowed"
                                      size="small"
                                      sx={{ mt: 2 }}
                                    />
                                  )}
                                  {activityData.isAnonymous && (
                                    <Chip
                                      label="Anonymous Responses"
                                      size="small"
                                      sx={{ mt: 2, ml: 1 }}
                                    />
                                  )}
                                </Paper>
                              );
                            }

                            // Discussion type
                            if (activityType === 'discussion') {
                              return (
                                <Paper
                                  elevation={0}
                                  sx={{
                                    p: 3,
                                    bgcolor: 'background.paper',
                                    border: (theme) => `1px solid ${theme.palette.divider}`,
                                    borderRadius: 2,
                                  }}
                                >
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                    Discussion Topic
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {activityData.topic || activityData.description || 'No topic provided'}
                                  </Typography>
                                </Paper>
                              );
                            }

                            // Default fallback
                            return (
                              <Box sx={{ p: 3, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                  Unsupported activity type: {activityData.type}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                                  {JSON.stringify(activityData)}
                                </Typography>
                              </Box>
                            );
                          })()}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              ) : (
                <>
                  {/* Messages Container */}
                  <Box sx={{ flex: 1, overflowY: 'auto', p: 3, minHeight: 0 }}>
                    {messages.length === 0 ? (
                      // Empty state - show welcome message
                      <Stack
                        spacing={3}
                        alignItems="center"
                        justifyContent="center"
                        sx={{
                          height: '100%',
                          minHeight: 400,
                          textAlign: 'center',
                          color: 'text.secondary',
                        }}
                      >
                        <Box
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Iconify
                            icon="solar:chat-round-line-bold-duotone"
                            width={40}
                            sx={{ color: 'primary.main' }}
                          />
                        </Box>
                        <Stack spacing={1}>
                          <Typography variant="h6" color="text.primary">
                            Start a Conversation
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                            Ask me to create a {activityType} for your class. I can help you generate engaging activities based on your requirements.
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                            onClick={() => setInputMessage(`Create a ${activityType} about `)}
                          >
                            Create a {activityType}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                            onClick={() => setInputMessage('Help me design an interactive activity')}
                          >
                            Get suggestions
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack spacing={2.5}>
                        {messages.map((msg, index) => (
                          <Stack
                            key={index}
                            direction="row"
                            spacing={1.5}
                            sx={{
                              alignItems: 'flex-start',
                              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            }}
                          >
                            {msg.role === 'assistant' && (
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  bgcolor: 'primary.main',
                                  boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.24)}`,
                                }}
                              >
                                <Iconify icon="solar:chat-round-line-bold-duotone" width={20} />
                              </Avatar>
                            )}

                            <Paper
                              elevation={0}
                              sx={{
                                p: 2,
                                maxWidth: '75%',
                                bgcolor: msg.role === 'user'
                                  ? 'primary.main'
                                  : (theme) => theme.palette.mode === 'light' ? 'background.paper' : 'grey.800',
                                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                                borderRadius: 2,
                                boxShadow: (theme) =>
                                  msg.role === 'user'
                                    ? `0 8px 16px ${alpha(theme.palette.primary.main, 0.24)}`
                                    : `0 4px 12px ${alpha(theme.palette.grey[500], 0.08)}`,
                                border: (theme) => msg.role === 'assistant' ? `1px solid ${alpha(theme.palette.grey[500], 0.12)}` : 'none',
                              }}
                            >
                              {/* Render markdown for assistant messages, plain text for user messages */}
                              {msg.role === 'assistant' ? (
                                <Box
                                  sx={{
                                    '& p': { mb: 1, lineHeight: 1.7 },
                                    '& p:last-child': { mb: 0 },
                                    '& ul, & ol': { pl: 2, mb: 1 },
                                    '& li': { mb: 0.5 },
                                    '& code': {
                                      px: 0.5,
                                      py: 0.25,
                                      borderRadius: 0.5,
                                      bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                      fontFamily: 'monospace',
                                      fontSize: '0.875em',
                                    },
                                    '& pre': {
                                      p: 1.5,
                                      borderRadius: 1,
                                      bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                                      overflow: 'auto',
                                      mb: 1,
                                    },
                                    '& pre code': {
                                      px: 0,
                                      py: 0,
                                      bgcolor: 'transparent',
                                    },
                                    '& strong': {
                                      fontWeight: 600,
                                    },
                                    '& em': {
                                      fontStyle: 'italic',
                                      color: 'primary.main',
                                      opacity: 0.8,
                                    },
                                    '& h1, & h2, & h3, & h4': {
                                      mt: 2,
                                      mb: 1,
                                      fontWeight: 600,
                                    },
                                    '& h1': { fontSize: '1.5rem' },
                                    '& h2': { fontSize: '1.25rem' },
                                    '& h3': { fontSize: '1.125rem' },
                                    '& h4': { fontSize: '1rem' },
                                    '& blockquote': {
                                      pl: 2,
                                      py: 0.5,
                                      borderLeft: (theme) => `3px solid ${theme.palette.primary.main}`,
                                      color: 'text.secondary',
                                      fontStyle: 'italic',
                                      mb: 1,
                                    },
                                    '& hr': {
                                      my: 2,
                                      border: 'none',
                                      borderTop: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                    },
                                  }}
                                >
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                  </ReactMarkdown>
                                  {msg.isStreaming && (
                                    <Box
                                      component="span"
                                      sx={{
                                        display: 'inline-block',
                                        width: 2,
                                        height: 16,
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
                                </Box>
                              ) : (
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                                  {msg.content}
                                </Typography>
                              )}

                              {/* Activity Selection Cards */}
                              {msg.activitySelection && msg.activitySelection.activities && (
                                <Box
                                  sx={{
                                    mt: 2,
                                    pt: 2,
                                    borderTop: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                  }}
                                >
                                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                                    {msg.activitySelection.message}
                                  </Typography>
                                  <Stack spacing={1}>
                                    {msg.activitySelection.activities.map((activity, idx) => (
                                      <Box
                                        key={idx}
                                        sx={{
                                          p: 2,
                                          borderRadius: 1.5,
                                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                          '&:hover': {
                                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                            transform: 'translateX(4px)',
                                          },
                                        }}
                                        onClick={async () => {
                                          try {
                                            // Directly send message to analyze this specific activity
                                            const message = `Please analyze the "${activity.title}" activity (ID: ${activity.activityId}) and retrieve its submissions.`;

                                            console.log('[Activity Selection] Clicked activity:', {
                                              title: activity.title,
                                              id: activity.activityId,
                                              conversationId: conversationId
                                            });

                                            if (!conversationId) {
                                              console.error('[Activity Selection] No conversation ID available');
                                              setError('No active conversation. Please refresh and try again.');
                                              return;
                                            }

                                            // Clear activity selection from the message
                                            setMessages(prev => {
                                              const updated = [...prev];
                                              const lastMsg = updated[updated.length - 1];
                                              if (lastMsg && lastMsg.activitySelection) {
                                                delete lastMsg.activitySelection;
                                              }
                                              return updated;
                                            });

                                            // Add user message
                                            const newUserMessage = {
                                              role: 'user',
                                              content: message,
                                              timestamp: new Date(),
                                            };

                                            setMessages(prev => [...prev, newUserMessage]);

                                            // Add streaming assistant message
                                            const newAssistantMessage = {
                                              role: 'assistant',
                                              content: '',
                                              timestamp: new Date(),
                                              isStreaming: true,
                                            };

                                            setMessages(prev => [...prev, newAssistantMessage]);
                                            setIsStreaming(true);

                                            try {
                                              await aiAssistantAPI.sendMessageStream(
                                                {
                                                  conversationId: conversationId,
                                                  message: message,
                                                  pdfContent: null,
                                                },
                                                (chunk) => {
                                                  if (typeof chunk === 'string') {
                                                    setMessages(prev => {
                                                      const updated = [...prev];
                                                      const lastMsg = updated[updated.length - 1];
                                                      if (lastMsg && lastMsg.role === 'assistant') {
                                                        lastMsg.content += chunk;
                                                      }
                                                      return updated;
                                                    });
                                                  } else if (chunk && typeof chunk === 'object' && chunk.type === 'status') {
                                                    setMessages(prev => {
                                                      const updated = [...prev];
                                                      const lastMsg = updated[updated.length - 1];
                                                      if (lastMsg && lastMsg.role === 'assistant') {
                                                        const statusText = `\n\n*${chunk.message}*`;
                                                        lastMsg.content += statusText;
                                                      }
                                                      return updated;
                                                    });
                                                  }
                                                },
                                                (complete) => {
                                                  setMessages(prev => {
                                                    const updated = [...prev];
                                                    const lastMsg = updated[updated.length - 1];
                                                    if (lastMsg && lastMsg.role === 'assistant') {
                                                      lastMsg.isStreaming = false;
                                                    }
                                                    return updated;
                                                  });
                                                  setIsStreaming(false);
                                                },
                                                (error) => {
                                                  console.error('Streaming error:', error || 'Unknown error');
                                                  setError(error || 'An unknown error occurred');
                                                  setIsStreaming(false);
                                                  setMessages(prev => {
                                                    const updated = [...prev];
                                                    const lastMsg = updated[updated.length - 1];
                                                    if (lastMsg && lastMsg.role === 'assistant') {
                                                      lastMsg.isStreaming = false;
                                                      if (!lastMsg.content) {
                                                        lastMsg.content = 'An error occurred while processing your request.';
                                                      }
                                                    }
                                                    return updated;
                                                  });
                                                }
                                              );
                                            } catch (err) {
                                              console.error('Error sending message:', err);
                                              setError(err?.message || 'Failed to send message');
                                              setIsStreaming(false);
                                              setMessages(prev => {
                                                const updated = [...prev];
                                                const lastMsg = updated[updated.length - 1];
                                                if (lastMsg && lastMsg.role === 'assistant') {
                                                  lastMsg.isStreaming = false;
                                                  if (!lastMsg.content) {
                                                    lastMsg.content = 'Failed to send message. Please try again.';
                                                  }
                                                }
                                                return updated;
                                              });
                                            }
                                          } catch (error) {
                                            console.error('[Activity Selection] Error in onClick handler:', error);
                                            setError(error?.message || 'Failed to process activity selection');
                                          }
                                        }}
                                      >
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                          <Box
                                            sx={{
                                              width: 40,
                                              height: 40,
                                              borderRadius: 1,
                                              bgcolor: 'primary.main',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                            }}
                                          >
                                            <Iconify
                                              icon={
                                                activity.type === 'quiz' ? "solar:book-2-bold-duotone" :
                                                  activity.type === 'poll' || activity.type === 'polling' ? "solar:chart-bold-duotone" :
                                                    "solar:chat-round-bold-duotone"
                                              }
                                              width={24}
                                              sx={{ color: 'white' }}
                                            />
                                          </Box>
                                          <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                              {activity.title}
                                            </Typography>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                              <Chip
                                                label={activity.type}
                                                size="small"
                                                sx={{
                                                  height: 20,
                                                  fontSize: '0.7rem',
                                                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                                                }}
                                              />
                                              <Typography variant="caption" color="text.secondary">
                                                {activity.isActive ? 'Active' : 'Inactive'}
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                • {new Date(activity.createdAt).toLocaleDateString()}
                                              </Typography>
                                            </Stack>
                                          </Box>
                                          <Iconify icon="solar:arrow-right-bold" width={20} sx={{ color: 'primary.main' }} />
                                        </Stack>
                                      </Box>
                                    ))}
                                  </Stack>
                                </Box>
                              )}

                              {/* Activity Ready Indicator in Chat */}
                              {msg.hasActivityData && msg.activityData && (
                                <Box
                                  sx={{
                                    mt: 2,
                                    pt: 2,
                                    borderTop: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                                  }}
                                >
                                  {(() => {
                                    const preview = activityPreviews.find(p => p.id === msg.previewId);
                                    const isCreated = preview?.isCreated || false;

                                    return (
                                      <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={1}
                                        sx={{
                                          p: 1.5,
                                          borderRadius: 1.5,
                                          bgcolor: (theme) => alpha(
                                            isCreated ? theme.palette.grey[500] : theme.palette.success.main,
                                            0.08
                                          ),
                                          border: (theme) => `1px solid ${alpha(
                                            isCreated ? theme.palette.grey[500] : theme.palette.success.main,
                                            0.24
                                          )}`,
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                          '&:hover': {
                                            bgcolor: (theme) => alpha(
                                              isCreated ? theme.palette.grey[500] : theme.palette.success.main,
                                              0.12
                                            ),
                                          },
                                        }}
                                        onClick={() => {
                                          const preview = activityPreviews.find(p => p.id === msg.previewId);
                                          console.log('[Activity Preview] Clicked preview card:', {
                                            activityData: msg.activityData,
                                            previewId: msg.previewId,
                                            preview: preview
                                          });

                                          // Ensure activityData has type field and isCreated status
                                          const activityDataWithType = {
                                            ...(msg.activityData || {}),
                                            type: msg.activityData?.type || preview?.activityType || activityType,
                                            isCreated: preview?.isCreated || msg.activityData?.isCreated || false
                                          };

                                          setActivityData(activityDataWithType);
                                          if (msg.previewId) {
                                            setCurrentPreviewId(msg.previewId);
                                          }
                                          setCurrentQuestionIndex(0);
                                          setShowActivityPreview(true);
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 1,
                                            bgcolor: isCreated ? 'grey.500' : 'success.main',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                        >
                                          <Iconify
                                            icon={isCreated ? "solar:check-circle-bold-duotone" : "solar:document-add-bold-duotone"}
                                            width={18}
                                            sx={{ color: 'white' }}
                                          />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                          <Typography variant="caption" sx={{ fontWeight: 600, color: isCreated ? 'text.secondary' : 'success.darker', display: 'block' }}>
                                            {isCreated ? 'Activity Created' : 'Activity Ready'}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {msg.activityData?.title || 'Click to preview'}
                                          </Typography>
                                        </Box>
                                        <Iconify icon="solar:arrow-right-bold" width={16} sx={{ color: isCreated ? 'grey.500' : 'success.main' }} />
                                      </Stack>
                                    );
                                  })()}
                                </Box>
                              )}

                              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                  {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                                {msg.role === 'assistant' && msg.isStreaming && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      opacity: 0.7,
                                      fontStyle: 'italic',
                                      color: 'primary.main',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 0.5
                                    }}
                                  >
                                    <Box
                                      component="span"
                                      sx={{
                                        width: 4,
                                        height: 4,
                                        borderRadius: '50%',
                                        bgcolor: 'primary.main',
                                        display: 'inline-block',
                                        animation: 'pulse 1.5s ease-in-out infinite',
                                        '@keyframes pulse': {
                                          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                          '50%': { opacity: 0.5, transform: 'scale(1.2)' },
                                        },
                                      }}
                                    />
                                    AI is thinking{thinkingDots}
                                  </Typography>
                                )}
                              </Stack>
                            </Paper>

                            {msg.role === 'user' && (
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  bgcolor: 'info.main',
                                  boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.info.main, 0.24)}`,
                                }}
                              >
                                <Iconify icon="solar:user-bold-duotone" width={20} />
                              </Avatar>
                            )}
                          </Stack>
                        ))}
                        <div ref={messagesEndRef} />
                      </Stack>
                    )}
                  </Box>

                  {/* Error Alert */}
                  {error && (
                    <Box sx={{ px: 3, pb: 2, flexShrink: 0 }}>
                      <Alert
                        severity="error"
                        onClose={() => setError(null)}
                        sx={{ borderRadius: 2 }}
                      >
                        {error}
                      </Alert>
                    </Box>
                  )}

                  {/* Input Area */}
                  <Box
                    sx={{
                      p: 3,
                      flexShrink: 0,
                      background: (theme) => theme.palette.mode === 'light' ? 'background.paper' : 'grey.900',
                      borderTop: (theme) => `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                    }}
                  >
                    <Stack spacing={1.5}>
                      <TextField
                        fullWidth
                        multiline
                        maxRows={4}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="I can help you to create or analyze activities. Ask me anything..."
                        disabled={isStreaming || isInitializing}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Iconify icon="solar:chat-round-line-bold-duotone" width={24} sx={{ color: 'text.disabled' }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip title={isStreaming ? 'AI is typing...' : 'Send message (Enter)'}>
                                <span>
                                  <IconButton
                                    color="primary"
                                    onClick={handleSendMessage}
                                    disabled={isStreaming || !inputMessage.trim() || isInitializing}
                                    sx={{
                                      bgcolor: 'primary.main',
                                      color: 'white',
                                      '&:hover': {
                                        bgcolor: 'primary.dark',
                                      },
                                      '&.Mui-disabled': {
                                        bgcolor: 'action.disabledBackground',
                                      },
                                      width: 40,
                                      height: 40,
                                    }}
                                  >
                                    {isStreaming ? (
                                      <CircularProgress size={20} sx={{ color: 'white' }} />
                                    ) : (
                                      <Iconify icon="solar:send-bold-duotone" width={20} />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </InputAdornment>
                          ),
                          sx: {
                            bgcolor: 'background.neutral',
                            '& fieldset': {
                              borderColor: (theme) => alpha(theme.palette.grey[500], 0.12),
                            },
                            '&:hover fieldset': {
                              borderColor: 'primary.main',
                            },
                          },
                        }}
                      />
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" color="text.secondary">
                          Press <Chip label="Enter" size="small" sx={{ height: 18, fontSize: '0.7rem' }} /> to send,
                          <Chip label="Shift + Enter" size="small" sx={{ height: 18, fontSize: '0.7rem', ml: 0.5 }} /> for new line
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                </>
              )}
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
