import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message, ConnectionStatus, ConversationState, CheckReservationResponse } from '@/types'

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
const CHECK_RESV_URL = 'https://ici.zeabur.app/webhook/checkResv'

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

// Helper: Extract time from AI's response
function extractTimeFromAIResponse(text: string): string | null {
  console.log('🕐 Extracting time from AI response:', text)

  // Special cases first
  if (text.includes('中午')) {
    console.log('✅ Detected: 中午 → 12:00')
    return '12:00'
  }

  // Pattern: "請稍等，我幫你查一下 [時間]"
  const patterns = [
    // 中文時間格式 - 標準點數
    { regex: /查一下\s*(\d{1,2})\s*點\s*半/, handler: (m: RegExpMatchArray) => {
      const hour = parseInt(m[1])
      return `${hour.toString().padStart(2, '0')}:30`
    }},
    { regex: /查一下\s*(\d{1,2})\s*點\s*(\d{1,2})\s*分/, handler: (m: RegExpMatchArray) => {
      const hour = parseInt(m[1])
      const minute = parseInt(m[2])
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }},
    { regex: /查一下\s*(\d{1,2})\s*點(?!\s*半|\s*\d)/, handler: (m: RegExpMatchArray) => {
      const hour = parseInt(m[1])
      return `${hour.toString().padStart(2, '0')}:00`
    }},

    // 早上/下午/晚上
    { regex: /查一下\s*早上\s*(\d{1,2})\s*點/, handler: (m: RegExpMatchArray) => {
      let hour = parseInt(m[1])
      if (hour === 12) hour = 0
      return `${hour.toString().padStart(2, '0')}:00`
    }},
    { regex: /查一下\s*下午\s*(\d{1,2})\s*點/, handler: (m: RegExpMatchArray) => {
      let hour = parseInt(m[1])
      if (hour < 12) hour += 12
      return `${hour.toString().padStart(2, '0')}:00`
    }},
    { regex: /查一下\s*晚上\s*(\d{1,2})\s*點/, handler: (m: RegExpMatchArray) => {
      let hour = parseInt(m[1])
      if (hour < 12) hour += 12
      return `${hour.toString().padStart(2, '0')}:00`
    }},

    // 24小時制格式
    { regex: /查一下\s*(\d{1,2}):(\d{2})/, handler: (m: RegExpMatchArray) => {
      const hour = parseInt(m[1])
      const minute = parseInt(m[2])
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }},

    // PM/AM 格式
    { regex: /查一下\s*(\d{1,2})\s*pm/i, handler: (m: RegExpMatchArray) => {
      let hour = parseInt(m[1])
      if (hour < 12) hour += 12
      return `${hour.toString().padStart(2, '0')}:00`
    }},
    { regex: /查一下\s*(\d{1,2})\s*am/i, handler: (m: RegExpMatchArray) => {
      let hour = parseInt(m[1])
      if (hour === 12) hour = 0
      return `${hour.toString().padStart(2, '0')}:00`
    }},
  ]

  // Try each pattern
  for (const { regex, handler } of patterns) {
    const match = text.match(regex)
    if (match) {
      try {
        const timeStr = handler(match)
        console.log(`✅ Extracted time: ${timeStr} from "${text}"`)
        return timeStr
      } catch (error) {
        console.error('Error in time extraction handler:', error)
        continue
      }
    }
  }

  console.log('❌ Could not extract time from AI response')
  return null
}

// Helper: Call reservation check API
async function checkReservationAvailability(time: string): Promise<CheckReservationResponse> {
  console.log('🌐 Calling reservation API:', {
    url: CHECK_RESV_URL,
    time,
    timestamp: new Date().toISOString()
  })

  try {
    const response = await fetch(CHECK_RESV_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ time })
    })

    console.log('📡 API response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: {
        'content-type': response.headers.get('content-type'),
        'access-control-allow-origin': response.headers.get('access-control-allow-origin')
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API error response:', errorText)
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    console.log('📥 Raw API response:', data)

    // Handle response format: { bookTime: "12:00", availability: true/false }
    // Support multiple field name variations
    const availabilityValue = data.Availability ?? data.availability ?? data.available ?? false

    const result = {
      available: availabilityValue,
      time: data.bookTime ?? time,
      message: data.message
    }

    console.log('📦 Parsed result:', {
      result,
      availabilityValue,
      'data.Availability': data.Availability,
      'data.availability': data.availability,
      'data.available': data.available
    })

    return result
  } catch (error) {
    console.error('❌ Error checking reservation:', {
      error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
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
  const actionProcessingRef = useRef<boolean>(false)

  const webhookUrl = options.webhookUrl ||
    import.meta.env.VITE_WEBHOOK_URL ||
    'https://ici.zeabur.app/webhook/realtime-ai'

  // Handle data channel messages
  const handleDataChannelMessage = useCallback(
    async (message: any) => {
      const { type } = message
  
      // ---- 小工具：封裝一次處理 CHECK_AVAILABILITY 的流程 ----
      const processCheckAvailability = async (time: string) => {
        try {
          console.log('🔍 Checking availability for time:', time)
          const result = await checkReservationAvailability(time)
          console.log('✅ Availability check result:', result)
  
          if (dataChannelRef.current?.readyState === 'open') {
            const payload = {
              bookTime: result.time,
              Availability: result.available, // false=有位, true=沒位（按 prompts 定義）
            }
            const text = `AVAILABILITY_RESULT: ${JSON.stringify(payload)}`
  
            console.log('📤 Sending availability result to Realtime AI:', {
              payload,
              text,
              fullResult: result,
            })
  
            const event = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text }],
              },
            }
  
            // 把查表結果丟給 Realtime 模型
            dataChannelRef.current.send(JSON.stringify(event))
  
            // ⭐ 查表完成 → 解除靜音（讓「七點有空位」這句可以被說出來）
            if (audioElementRef.current) {
              audioElementRef.current.muted = false
            }
  
            // 觸發新的回覆
            dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }))
          }
        } catch (error) {
          console.error('❌ Error processing CHECK_AVAILABILITY action:', error)
  
          if (dataChannelRef.current?.readyState === 'open') {
            const errorText = 'AVAILABILITY_RESULT: {"error": "查詢失敗，請稍後再試"}'
            const event = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text: errorText }],
              },
            }
            dataChannelRef.current.send(JSON.stringify(event))
  
            if (audioElementRef.current) {
              audioElementRef.current.muted = false
            }
            dataChannelRef.current.send(JSON.stringify({ type: 'response.create' }))
          }
        } finally {
          actionProcessingRef.current = false
          currentTranscriptRef.current.assistant = ''
          assistantMessageTimestampRef.current = null
          setConversationState('listening')
        }
      }
  
      // ------------------------------------------------------------------
      // 1) 使用者語音轉文字：實時字幕（delta）
      // ------------------------------------------------------------------
      if (type === 'conversation.item.input_audio_transcription.delta') {
        currentTranscriptRef.current.user += message.delta || ''
  
        if (!userMessageTimestampRef.current) {
          userMessageTimestampRef.current = Date.now()
        }
  
        setMessages(prev =>
          updateOrCreateTempMessage(
            prev,
            TEMP_USER_ID,
            'user',
            currentTranscriptRef.current.user,
            userMessageTimestampRef.current!,
          ),
        )
      }
  
      // ------------------------------------------------------------------
      // 2) 使用者語音結束：完成一句話
      //    👉 不在這裡靜音，是否靜音由「是否進入 TOOL PHASE」決定
      // ------------------------------------------------------------------
      else if (type === 'conversation.item.input_audio_transcription.completed') {
        const userText = message.transcript || currentTranscriptRef.current.user
        if (userText.trim()) {
          const finalTimestamp = userMessageTimestampRef.current || Date.now()
          const finalMessage: Message = {
            id: `user-${finalTimestamp}`,
            role: 'user',
            content: userText.trim(),
            timestamp: finalTimestamp,
          }
  
          setMessages(prev =>
            replaceTempMessage(prev, TEMP_USER_ID, finalMessage, TEMP_ASSISTANT_ID),
          )
  
          options.onMessage?.(finalMessage)
          currentTranscriptRef.current.user = ''
          userMessageTimestampRef.current = null
        }
  
        setConversationState('processing')
      }
  
      // ------------------------------------------------------------------
      // 3) AI 語音字幕 delta（實時）
      //    👉 新邏輯：檢測「請稍等，我幫你查一下 [時間]」觸發查表
      // ------------------------------------------------------------------
      else if (type === 'response.audio_transcript.delta') {
        const delta = message.delta || ''
        currentTranscriptRef.current.assistant += delta

        if (!assistantMessageTimestampRef.current) {
          assistantMessageTimestampRef.current = Date.now()
        }

        const currentText = currentTranscriptRef.current.assistant

        // ⭐ 新檢測邏輯：檢測「請稍等，我幫你查一下」
        const isTriggerPhrase = currentText.includes('請稍等') && currentText.includes('查一下')

        if (isTriggerPhrase) {
          console.log('🎯 Detected trigger phrase in delta:', currentText)

          // 嘗試提取時間
          const extractedTime = extractTimeFromAIResponse(currentText)

          if (extractedTime && !actionProcessingRef.current) {
            // ✅ 成功提取到時間，進入查表流程
            console.log('🎯 Time extracted, entering tool phase:', extractedTime)
            actionProcessingRef.current = true

            // ⭐ 不立即靜音，讓當前句子說完
            // 靜音會在 response.audio_transcript.done 時執行

            // ⭐ 也不立即 cancel，讓當前回應說完
            // 阻止後續新的回應會在 done 時處理

            // 保留已說的話（"請稍等，我幫你查一下 12點"）在 UI 上
            const finalTimestamp = assistantMessageTimestampRef.current || Date.now()
            setMessages(prev => {
              const tempUserIndex = prev.findIndex(m => m.id === TEMP_USER_ID)
              return updateOrCreateTempMessage(
                prev,
                TEMP_ASSISTANT_ID,
                'assistant',
                currentText, // 顯示完整的觸發句
                finalTimestamp,
                tempUserIndex,
              )
            })

            // 清空 transcript 準備接收查表結果的回應
            currentTranscriptRef.current.assistant = ''
            assistantMessageTimestampRef.current = null

            // 立即開始查表（並行進行）
            processCheckAvailability(extractedTime)

            return // 重要：阻止後續處理
          }

          // 如果還沒提取到完整時間，繼續累積文本
          // （可能 AI 還在說 "請稍等，我幫你查一下..."，時間還沒說完）
        }

        // 如果正在處理 action 或已靜音，不更新 UI
        if (audioElementRef.current?.muted || actionProcessingRef.current) {
          return
        }

        // ⭐ 正常對話：streaming 助理文本
        setMessages(prev => {
          const tempUserIndex = prev.findIndex(m => m.id === TEMP_USER_ID)
          return updateOrCreateTempMessage(
            prev,
            TEMP_ASSISTANT_ID,
            'assistant',
            currentTranscriptRef.current.assistant,
            assistantMessageTimestampRef.current!,
            tempUserIndex,
          )
        })
        setConversationState('responding')
      }
  
      // ------------------------------------------------------------------
      // 4) AI 語音字幕完成
      // ------------------------------------------------------------------
      else if (type === 'response.audio_transcript.done') {
        const assistantText = message.transcript || currentTranscriptRef.current.assistant
        const trimmed = assistantText.trim()

        if (!trimmed) {
          currentTranscriptRef.current.assistant = ''
          assistantMessageTimestampRef.current = null
          setConversationState('listening')
          return
        }

        // ⭐ 檢查是否為查表觸發句剛說完
        if (actionProcessingRef.current) {
          console.log('🔇 Trigger sentence completed, muting audio and canceling further responses')

          // 現在靜音（當前句子已經說完了）
          if (audioElementRef.current) {
            audioElementRef.current.muted = true
          }

          // 取消後續回應（避免 AI 繼續說多餘的話）
          if (dataChannelRef.current?.readyState === 'open') {
            dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }))
          }

          // 清空 transcript，等待查表結果
          currentTranscriptRef.current.assistant = ''
          assistantMessageTimestampRef.current = null
          setConversationState('processing')
          return
        }

        // ⭐ 保底檢測：如果 delta 階段沒檢測到，在 done 時檢測
        const isTriggerPhrase = trimmed.includes('請稍等') && trimmed.includes('查一下')

        if (isTriggerPhrase) {
          console.log('🎯 Detected trigger phrase in done (fallback):', trimmed)

          const extractedTime = extractTimeFromAIResponse(trimmed)

          if (extractedTime && dataChannelRef.current?.readyState === 'open') {
            console.log('🎯 Time extracted in done, entering tool phase:', extractedTime)
            actionProcessingRef.current = true

            // 立即靜音並 cancel
            if (audioElementRef.current) {
              audioElementRef.current.muted = true
            }

            dataChannelRef.current.send(JSON.stringify({ type: 'response.cancel' }))

            // 清理 UI 中的臨時消息（如果有的話）
            setMessages(prev => prev.filter(m => m.id !== TEMP_ASSISTANT_ID))

            processCheckAvailability(extractedTime)

            currentTranscriptRef.current.assistant = ''
            assistantMessageTimestampRef.current = null
            setConversationState('processing')
            return
          }
        }

        // ⭐ 正常對話：完成最終消息
        const finalTimestamp = assistantMessageTimestampRef.current || Date.now()
        const finalMessage: Message = {
          id: `assistant-${finalTimestamp}`,
          role: 'assistant',
          content: trimmed,
          timestamp: finalTimestamp,
        }

        setMessages(prev => replaceTempMessage(prev, TEMP_ASSISTANT_ID, finalMessage))
        options.onMessage?.(finalMessage)

        currentTranscriptRef.current.assistant = ''
        assistantMessageTimestampRef.current = null
        setConversationState('listening')
      }
    },
    [options],
  )

  // Connect to N8N webhook and establish WebRTC
  const connect = useCallback(async () => {
    try {
      setConnectionStatus('connecting')

      console.log('🔌 Connecting to webhook:', {
        url: webhookUrl,
        timestamp: new Date().toISOString()
      })

      // Fetch session token from N8N
      const response = await fetch(webhookUrl, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      })

      console.log('📡 Webhook response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: {
          'content-type': response.headers.get('content-type'),
          'access-control-allow-origin': response.headers.get('access-control-allow-origin')
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Webhook error:', errorText)
        throw new Error(`Failed to connect to webhook: ${response.status} ${response.statusText}`)
      }

      const data = await response.text()
      const clientSecret = extractClientSecret(data)

      if (!clientSecret) {
        console.error('❌ Could not extract client_secret from response:', data)
        throw new Error('Could not find client_secret in response')
      }

      console.log('✅ Client secret obtained successfully')

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
    actionProcessingRef.current = false

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
