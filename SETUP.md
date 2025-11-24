# Setup Guide - Realtime Chat with N8N Integration

This guide will help you connect your frontend to the N8N backend for OpenAI Realtime API.

## Prerequisites

1. N8N workflow deployed and running at: `https://ici.zeabur.app/webhook-test/realtime-ai`
2. N8N workflow must be in **production mode** (not test mode)
3. Modern browser with WebRTC support
4. Microphone permissions

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment (Optional)

If your webhook URL is different, create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set your webhook URL:

```env
VITE_WEBHOOK_URL=https://your-n8n-instance.com/webhook/realtime-ai
```

### 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## How It Works

### Connection Flow

1. **Click "Get Started"** → Frontend fetches session token from N8N webhook
2. **N8N responds** → Returns HTML with embedded `client_secret` (ephemeral token)
3. **WebRTC Setup** → Frontend establishes peer connection with OpenAI
4. **Audio Streaming** → Microphone audio streams to OpenAI via WebRTC
5. **Transcription** → Real-time transcripts appear via data channel events

### Architecture

```
Browser (Frontend)
    ↓ GET request
N8N Webhook (Backend)
    ↓ Creates session with OpenAI API
    ↓ Returns client_secret
Browser establishes WebRTC
    ↓ Direct connection
OpenAI Realtime API
```

### Key Features

- **Real-time voice chat** with AI
- **Live transcription** of both user and AI
- **WebRTC-based** for low latency
- **Auto-playing** AI responses
- **Visual status** indicators

## Troubleshooting

### Connection Issues

**Error: "Failed to connect to webhook: 404"**
- N8N workflow is in test mode. Click "Execute workflow" in N8N or switch to production mode
- Verify the webhook URL is correct

**Error: "Could not find client_secret in response"**
- N8N workflow is not returning the expected format
- Check the N8N "Return HTML" node includes the client_secret variable

**Error: "Failed to establish WebRTC connection"**
- The client_secret may have expired (ephemeral tokens are time-limited)
- Try disconnecting and reconnecting to get a fresh token
- Check browser console for detailed error messages

### Microphone Issues

**No audio detected:**
- Grant microphone permissions in browser
- Check browser settings for microphone access
- Ensure no other app is using the microphone

**Echo or feedback:**
- Use headphones
- Lower system volume
- Check audio device settings

### Transcription Issues

**No transcripts appearing:**
- Check browser console for data channel messages
- Verify the data channel is open (look for "Data channel opened" log)
- N8N workflow must enable input transcription in OpenAI session config

**Partial transcripts only:**
- This is normal - transcripts stream in real-time as "deltas"
- Complete transcripts appear when speech finishes

## Browser Compatibility

Requires modern browser with:
- WebRTC support (RTCPeerConnection)
- getUserMedia API
- RTCDataChannel support

**Tested browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14.1+
- Edge 90+

## Security Notes

- **HTTPS required** in production for microphone access
- **Client secrets** are ephemeral (short-lived)
- **Direct WebRTC** connection to OpenAI (no audio goes through N8N)
- **API key** is secured server-side in N8N

## Development vs Production

### Development Mode
- Runs on http://localhost:3000
- Microphone may require HTTPS in some browsers
- Use Chrome flags for local testing if needed

### Production Mode
- Must use HTTPS
- Configure proper CORS settings
- Ensure N8N webhook is in production mode

## Advanced Configuration

### Custom Webhook URL

Pass the webhook URL directly to the hook:

```typescript
const chat = useRealtimeChat({
  webhookUrl: 'https://custom-domain.com/webhook/ai',
  onError: (error) => console.error(error)
})
```

### OpenAI Model Configuration

The model is currently hardcoded as `gpt-4o-realtime-preview-2024-12-17`.

To change it, modify line 105 in `src/hooks/useRealtimeChat.ts`:

```typescript
const sdpResponse = await fetch('https://api.openai.com/v1/realtime?model=YOUR-MODEL-HERE', {
```

**Note:** The model should match what's configured in your N8N workflow.

## Next Steps

1. Test the connection by clicking "Get Started"
2. Speak into your microphone and see transcripts appear
3. Listen to AI responses
4. Monitor browser console for debugging info

## Support

For issues:
- Check browser console logs
- Verify N8N workflow is active
- Ensure OpenAI API key is valid in N8N
- Review N8N execution logs

## License

MIT License
