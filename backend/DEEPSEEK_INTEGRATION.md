# DeepSeek Integration Guide

## Overview
This project now supports both GitHub Models and DeepSeek as LLM providers for AI-assisted activity generation. DeepSeek offers a cost-effective alternative with OpenAI-compatible API.

## Configuration

### 1. Get DeepSeek API Key
1. Visit [https://platform.deepseek.com](https://platform.deepseek.com)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key

### 2. Update Configuration
Edit `backend/InteractiveHub.WebAPI/appsettings.Development.json`:

```json
{
  "GitHub": {
    "Token": "your-github-token-here"
  },
  "DeepSeek": {
    "ApiKey": "your-deepseek-api-key-here",
    "Model": "deepseek-chat"
  },
  "LLM": {
    "Provider": "DeepSeek"
  }
}
```

### 3. Switch Between Providers
Change the `LLM.Provider` setting:
- `"GitHub"` - Use GitHub Models (default)
- `"DeepSeek"` - Use DeepSeek API

## Features Supported

Both providers support:
- ✅ Streaming responses (Server-Sent Events)
- ✅ Function calling for activity creation
- ✅ Quiz generation
- ✅ Poll generation
- ✅ Discussion generation
- ✅ PDF content analysis
- ✅ Conversation history

## API Endpoints

### GitHub Models
- Endpoint: `https://models.inference.ai.azure.com/chat/completions`
- Model: `gpt-4o`
- Rate Limit: 50 requests per day (free tier)

### DeepSeek
- Endpoint: `https://api.deepseek.com/v1/chat/completions`
- Model: `deepseek-chat`
- Pricing: More cost-effective than GitHub Models
- Rate Limit: Based on your subscription plan

## Implementation Details

### Modified Files

1. **Backend Configuration**
   - `appsettings.Development.json` - Added DeepSeek settings

2. **Service Layer**
   - `ClassManager.AIAssistant.cs` - Updated `GenerateActivityWithAIAsync` to support multiple providers
   - `IClassManager.cs` - Updated interface signature

3. **Controller Layer**
   - `AIAssistantController.cs` - Added provider selection logic in both `SendMessage` and `SendMessageStream` methods

### Code Changes

The implementation automatically:
1. Reads the `LLM.Provider` configuration
2. Selects appropriate API endpoint and key
3. Uses correct model name
4. Maintains full compatibility with existing function calling

## Testing

1. Set `LLM.Provider` to `"DeepSeek"` in configuration
2. Add your DeepSeek API key
3. Start the application
4. Create a new AI conversation
5. Ask the AI to generate an activity
6. Verify the activity is created successfully

## Troubleshooting

### "DeepSeek API key not configured" Error
- Ensure `DeepSeek.ApiKey` is set in `appsettings.Development.json`
- Verify the key is valid and not expired

### Function Calling Not Working
- DeepSeek uses OpenAI-compatible API format
- Verify the `tools` parameter is being sent correctly
- Check response format matches OpenAI's structure

### Rate Limit Errors
- For GitHub Models: Wait 24 hours or switch to DeepSeek
- For DeepSeek: Check your account quota and upgrade if needed

## Benefits of DeepSeek

1. **Cost-Effective**: Lower pricing compared to other providers
2. **High Compatibility**: OpenAI-compatible API requires minimal code changes
3. **No Rate Limits**: Higher or unlimited requests based on subscription
4. **Same Features**: Supports all function calling capabilities

## Migration from GitHub Models

If you're hitting GitHub Models rate limits:

1. Get a DeepSeek API key (5 minutes)
2. Update configuration (1 minute)
3. Restart the application (30 seconds)
4. Continue using AI assistant without interruption

No database migration or frontend changes required!
