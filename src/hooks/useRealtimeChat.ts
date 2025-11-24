import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message, ConnectionStatus, ConversationState } from '@/types'

interface UseRealtimeChatOptions {
  apiKey?: string
  webhookUrl?: string
  onMessage?: (message: Message) => void
  onError?: (error: Error) => void
}

// Constants
const TEMP_USER_ID = 'temp-user-transcript'
const TEMP_ASSISTANT_ID = 'temp-assistant-transcript'
const OPENAI_MODEL = 'gpt-4o-realtime-preview-2024-12-17'
const DATA_CHANNEL_NAME = 'oai-events'

// Helper: Extract client secret from various response formats
function extractClientSecret(data: string): string | null {
  // Try JSON parsing first
  try {
    const jsonData = JSON.parse(data)

    // Array format (full OpenAI response from N8N)
    if (Array.isArray(jsonData) && jsonData.length > 0) {
      return jsonData[0]?.client_secret?.value || null
    }

    // Object format with nested value
    if (jsonData.client_secret) {
      if (typeof jsonData.client_secret === 'string') {
        return jsonData.client_secret
      }
      if (jsonData.client_secret.value) {
        return jsonData.client_secret.value
      }
    }

    // Alternative property names
    return jsonData.clientSecret || jsonData.data?.client_secret || null
  } catch {
    // Not JSON, try regex extraction from HTML
    const patterns = [
      /EPHEMERAL_KEY\s*=\s*["']([^"']+)["']/,
      /clientSecret\s*=\s*["']([^"']+)["']/,
      /client_secret["']?\s*:\s*["']([^"']+)["']/,
      /client_secret["']?\s*=\s*["']([^"']+)["']/
    ]

    for (const pattern of patterns) {
      const match = data.match(pattern)
      if (match?.[1]) return match[1]
    }

    return null
  }
}

// Helper: Update or create temporary message
function updateOrCreateTempMessage(
  messages: Message[],
  tempId: string,
  role: 'user' | 'assistant',
  content: string,
  timestamp: number,
  insertAfterIndex?: number
): Message[] {
  const existingIndex = messages.findIndex(m => m.id === tempId)

  if (existingIndex !== -1) {
    // Update existing temp message
    const updated = [...messages]
    updated[existingIndex] = {
      ...updated[existingIndex],
      content,
      timestamp
    }
    return updated
  }

  // Create new temp message
  const newMessage: Message = {
    id: tempId,
    role,
    content,
    timestamp
  }

  // Insert at specific position or add to end
  if (insertAfterIndex !== undefined && insertAfterIndex !== -1) {
    const updated = [...messages]
    updated.splice(insertAfterIndex + 1, 0, newMessage)
    return updated
  }

  return [...messages, newMessage]
}

// Helper: Replace temp message with final one
function replaceTempMessage(
  messages: Message[],
  tempId: string,
  finalMessage: Message,
  ensureBeforeTempId?: string
): Message[] {
  const tempIndex = messages.findIndex(m => m.id === tempId)
  const otherTempIndex = ensureBeforeTempId
    ? messages.findIndex(m => m.id === ensureBeforeTempId)
    : -1

  if (tempIndex !== -1) {
    const updated = [...messages]
    updated[tempIndex] = finalMessage

    // Ensure correct ordering if needed
    if (otherTempIndex !== -1 && otherTempIndex < tempIndex) {
      const otherMsg = updated[otherTempIndex]
      updated.splice(otherTempIndex, 1)
      const newIndex = updated.findIndex(m => m.id === finalMessage.id)
      updated.splice(newIndex + 1, 0, otherMsg)
    }

    return updated
  }

  // No temp message found - insert before other temp if exists
  if (otherTempIndex !== -1) {
    const updated = [...messages]
    updated.splice(otherTempIndex, 0, finalMessage)
    return updated
  }

  // Otherwise add to end
  return [...messages, finalMessage]
}

export function useRealtimeChat(options: UseRealtimeChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [conversationState, setConversationState] = useState<ConversationState>('idle')
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const currentTranscriptRef = useRef({ user: '', assistant: '' })
  const userMessageTimestampRef = useRef<number | null>(null)
  const assistantMessageTimestampRef = useRef<number | null>(null)

  const webhookUrl = options.webhookUrl ||
    import.meta.env.VITE_WEBHOOK_URL ||
    'https://ici.zeabur.app/webhook-test/realtime-ai'

  // Handle data channel messages
  const handleDataChannelMessage = useCallback((message: any) => {
    const { type } = message

    // User transcription delta (real-time)
    if (type === 'conversation.item.input_audio_transcription.delta') {
      currentTranscriptRef.current.user += message.delta || ''

      if (!userMessageTimestampRef.current) {
        userMessageTimestampRef.current = Date.now()
      }

      setMessages(prev => updateOrCreateTempMessage(
        prev,
        TEMP_USER_ID,
        'user',
        currentTranscriptRef.current.user,
        userMessageTimestampRef.current!
      ))
    }

    // User transcription completed
    else if (type === 'conversation.item.input_audio_transcription.completed') {
      const userText = message.transcript || currentTranscriptRef.current.user
      if (userText.trim()) {
        const finalTimestamp = userMessageTimestampRef.current || Date.now()
        const finalMessage: Message = {
          id: `user-${finalTimestamp}`,
          role: 'user',
          content: userText.trim(),
          timestamp: finalTimestamp
        }

        setMessages(prev => replaceTempMessage(
          prev,
          TEMP_USER_ID,
          finalMessage,
          TEMP_ASSISTANT_ID
        ))

        options.onMessage?.(finalMessage)
        currentTranscriptRef.current.user = ''
        userMessageTimestampRef.current = null
      }
      setConversationState('processing')
    }

    // AI response delta (real-time)
    else if (type === 'response.audio_transcript.delta') {
      currentTranscriptRef.current.assistant += message.delta || ''

      if (!assistantMessageTimestampRef.current) {
        assistantMessageTimestampRef.current = Date.now()
      }

      setMessages(prev => {
        const tempUserIndex = prev.findIndex(m => m.id === TEMP_USER_ID)
        return updateOrCreateTempMessage(
          prev,
          TEMP_ASSISTANT_ID,
          'assistant',
          currentTranscriptRef.current.assistant,
          assistantMessageTimestampRef.current!,
          tempUserIndex
        )
      })
      setConversationState('responding')
    }

    // AI response completed
    else if (type === 'response.audio_transcript.done') {
      const assistantText = message.transcript || currentTranscriptRef.current.assistant
      if (assistantText.trim()) {
        const finalTimestamp = assistantMessageTimestampRef.current || Date.now()
        const finalMessage: Message = {
          id: `assistant-${finalTimestamp}`,
          role: 'assistant',
          content: assistantText.trim(),
          timestamp: finalTimestamp
        }

        setMessages(prev => replaceTempMessage(prev, TEMP_ASSISTANT_ID, finalMessage))

        options.onMessage?.(finalMessage)
        currentTranscriptRef.current.assistant = ''
        assistantMessageTimestampRef.current = null
      }
      setConversationState('listening')
    }
  }, [options])

  // Connect to N8N webhook and establish WebRTC
  const connect = useCallback(async () => {
    try {
      setConnectionStatus('connecting')

      // Fetch session token from N8N
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`Failed to connect to webhook: ${response.status}`)
      }

      const data = await response.text()
      const clientSecret = extractClientSecret(data)

      if (!clientSecret) {
        console.error('Response:', data)
        throw new Error('Could not find client_secret in response')
      }

      // Set up WebRTC peer connection
      const peerConnection = new RTCPeerConnection()
      peerConnectionRef.current = peerConnection

      // Set up audio element for AI responses
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio()
        audioElementRef.current.autoplay = true
      }

      peerConnection.ontrack = (event) => {
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0]
        }
      }

      // Add microphone track
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))

      // Set up data channel for transcripts
      const dataChannel = peerConnection.createDataChannel(DATA_CHANNEL_NAME)
      dataChannelRef.current = dataChannel

      dataChannel.onopen = () => {
        setConnectionStatus('connected')
        setConversationState('idle')
      }

      dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleDataChannelMessage(message)
        } catch (error) {
          console.error('Error parsing data channel message:', error)
        }
      }

      // Create and send SDP offer
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${OPENAI_MODEL}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clientSecret}`,
            'Content-Type': 'application/sdp'
          },
          body: offer.sdp
        }
      )

      if (!sdpResponse.ok) {
        throw new Error(`Failed to establish WebRTC: ${sdpResponse.status}`)
      }

      const answerSdp = await sdpResponse.text()
      await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      setIsAudioEnabled(true)
      setConversationState('listening')

    } catch (error) {
      console.error('Connection error:', error)
      setConnectionStatus('error')
      options.onError?.(error as Error)
    }
  }, [options, webhookUrl, handleDataChannelMessage])

  // Disconnect and cleanup
  const disconnect = useCallback(() => {
    peerConnectionRef.current?.close()
    dataChannelRef.current?.close()
    mediaStreamRef.current?.getTracks().forEach(track => track.stop())

    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.srcObject = null
    }

    // Reset all refs
    peerConnectionRef.current = null
    dataChannelRef.current = null
    mediaStreamRef.current = null
    currentTranscriptRef.current = { user: '', assistant: '' }
    userMessageTimestampRef.current = null
    assistantMessageTimestampRef.current = null

    // Reset state
    setMessages([])
    setConnectionStatus('disconnected')
    setConversationState('idle')
    setIsAudioEnabled(false)
  }, [])

  // Toggle listening
  const startListening = useCallback(async () => {
    setIsAudioEnabled(true)
    setConversationState('listening')
  }, [])

  const stopListening = useCallback(() => {
    mediaStreamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = false
    })
    setIsAudioEnabled(false)
    setConversationState('idle')
  }, [])

  // Send text message
  const sendMessage = useCallback((content: string) => {
    const message: Message = {
      id: `text-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, message])
    options.onMessage?.(message)

    // Send through data channel if available
    if (dataChannelRef.current?.readyState === 'open') {
      try {
        dataChannelRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: content }]
          }
        }))

        dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }))
      } catch (error) {
        console.error('Error sending message:', error)
      }
    }
  }, [options])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect()
  }, [disconnect])

  return {
    messages,
    connectionStatus,
    conversationState,
    isAudioEnabled,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage,
    clearMessages
  }
}
