# Realtime Chat Application

A modern real-time voice chat application built with React, TypeScript, and Vite, integrated with OpenAI's Realtime API through N8N workflow automation.

## ✨ Features

- **🎤 Real-time Voice Chat**: Natural conversations with AI using voice input
- **📝 Live Transcription**: Real-time transcription of both user and AI speech
- **🔄 Smart Message Ordering**: Intelligent handling of async transcription events
- **💬 Text Messaging**: Fallback text input support
- **🎨 Beautiful UI**: Modern, responsive design with Tailwind CSS
- **📱 Mobile-Friendly**: Works seamlessly on all devices
- **⚡ WebRTC Powered**: Low-latency audio streaming

## 🏗️ Architecture

```
Browser (Frontend) ─────┐
                        │
                        ├──> N8N Webhook (Get ephemeral token)
                        │
                        └──> OpenAI Realtime API (WebRTC connection)
                                    │
                                    ├─> Audio Stream (bidirectional)
                                    └─> Data Channel (transcriptions)
```

## 🛠️ Technology Stack

- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **WebRTC** - Real-time audio communication
- **N8N** - Workflow automation for token management
- **OpenAI Realtime API** - AI voice conversation

## 📁 Project Structure

```
src/
├── components/
│   ├── ChatPage.tsx            # Main chat interface
│   ├── ChatMessage.tsx         # Message bubble component
│   ├── ChatInput.tsx           # Text input component
│   └── FloatingActionBar.tsx   # Status indicator & controls
├── hooks/
│   └── useRealtimeChat.ts      # WebRTC & state management
├── types/
│   └── index.ts                # TypeScript definitions
├── App.tsx                     # Root component
├── main.tsx                    # Entry point
├── index.css                   # Global styles
└── vite-env.d.ts               # Vite environment types
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- N8N instance with OpenAI Realtime API workflow
- Modern browser with WebRTC support

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd realtimechat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (optional)
   ```bash
   cp .env.example .env
   ```

   Edit `.env` if your N8N webhook URL differs:
   ```env
   VITE_WEBHOOK_URL=https://your-n8n-instance.com/webhook/realtime-ai
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   - Navigate to `http://localhost:3000`
   - Click "Get Started"
   - Allow microphone access
   - Start chatting!

### Production Build

```bash
npm run build
npm run preview
```

## 🔧 N8N Setup

Your N8N workflow should:

1. **Receive GET request** from frontend
2. **Call OpenAI API** to create a realtime session
   ```
   POST https://api.openai.com/v1/realtime/sessions
   ```
3. **Return client_secret** in one of these formats:
   - Simple: `{ "client_secret": "ek_xxx..." }`
   - Nested: `{ "client_secret": { "value": "ek_xxx..." } }`
   - Array: `[{ "client_secret": { "value": "ek_xxx..." } }]`

The frontend will automatically extract the token from any of these formats.

## 💡 How It Works

### Connection Flow

1. **User clicks "Get Started"**
2. **Frontend fetches ephemeral token** from N8N webhook
3. **WebRTC peer connection** established with OpenAI
4. **Microphone audio streams** to OpenAI via WebRTC
5. **AI responses play** through browser audio element
6. **Transcriptions arrive** via data channel in real-time

### Message Ordering

The app intelligently handles async transcription events:
- User speech starts → Creates temporary message
- AI responds (may arrive before user transcription completes)
- User transcription completes → Replaces temp message, ensures correct order
- AI transcription completes → Finalizes AI message

This ensures messages always display in the correct conversational order.

## 🎨 UI Components

### ChatPage
Main container managing connection state and message display.

### ChatMessage
Displays individual messages with:
- User/AI avatars
- Timestamps
- Responsive bubbles
- Smooth animations

### FloatingActionBar
Shows conversation state:
- **Ready** (gray) - Connected, idle
- **Listening** (blue, pulsing) - Capturing audio
- **Processing** (orange, pulsing) - AI thinking
- **Responding** (green, pulsing) - AI speaking

### ChatInput
Text fallback input with:
- Enter key support
- Send button
- Disabled during processing

## 📝 Key Files

### `useRealtimeChat.ts`
Custom hook managing:
- WebRTC connection setup
- Audio stream handling
- Data channel message processing
- Message state with smart ordering
- Connection lifecycle

**Helper Functions:**
- `extractClientSecret()` - Parses multiple N8N response formats
- `updateOrCreateTempMessage()` - Manages temporary transcription messages
- `replaceTempMessage()` - Handles message finalization with ordering

### `vite-env.d.ts`
TypeScript definitions for Vite environment variables.

## 🔐 Environment Variables

```env
# 正式环境 (Production) - 当前使用
VITE_WEBHOOK_URL=https://ici.zeabur.app/webhook/realtime-ai

# 测试环境 (Testing)
# VITE_WEBHOOK_URL=https://ici.zeabur.app/webhook-test/realtime-ai
```

**环境说明:**
- **正式环境**: `/webhook/realtime-ai` - N8N workflow 需设置为 production mode
- **测试环境**: `/webhook-test/realtime-ai` - 需要在 N8N 手动点击 "Execute workflow"
- 如果不设置此变量，代码会自动使用正式环境 URL

## 🌐 Browser Support

**Requirements:**
- WebRTC support (RTCPeerConnection)
- getUserMedia API
- Modern JavaScript (ES2020+)

**Tested:**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14.1+
- ✅ Edge 90+

**Note:** HTTPS required in production for microphone access.

## 🐛 Troubleshooting

### Connection fails with 404
- N8N workflow not active or in test mode
- Activate workflow in N8N or switch to production mode

### No transcriptions appearing
- Check browser console for data channel events
- Verify N8N workflow enables `input_audio_transcription` in session config

### Microphone not working
- Grant browser permissions
- Ensure HTTPS in production
- Check no other app is using microphone

### Messages appear in wrong order
- This should be fixed automatically by smart ordering logic
- Check console for data channel message types and timing

## 📊 Performance

- **Bundle size:** ~154 KB (gzipped: ~50 KB)
- **Initial load:** < 1s
- **WebRTC latency:** < 100ms
- **Build time:** ~400ms

## 🔄 Development Workflow

```bash
# Development
npm run dev          # Start dev server with HMR

# Building
npm run build        # TypeScript + Vite production build
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # ESLint check
```

## 📚 Documentation

- [SETUP.md](./SETUP.md) - Detailed setup guide and troubleshooting
- [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) - Code optimization details

## 🎯 Future Enhancements

- [ ] Message persistence (localStorage)
- [ ] Multiple conversation threads
- [ ] Export conversation history
- [ ] Custom AI instructions
- [ ] Voice selection
- [ ] Conversation playback
- [ ] Mobile app (React Native)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - free to use for personal and commercial projects.

## 🙏 Acknowledgments

- Built with OpenAI Realtime API
- Workflow automation powered by N8N
- UI inspired by modern messaging apps
- WebRTC implementation based on OpenAI examples

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review browser console logs

---

**Made with ❤️ using React + TypeScript + OpenAI Realtime API**
