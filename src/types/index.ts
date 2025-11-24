export type MessageRole = 'user' | 'assistant' | 'system'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export type ConversationState = 'idle' | 'listening' | 'processing' | 'responding'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
}

export interface RealtimeConfig {
  apiKey: string
  model?: string
  voice?: string
}

export interface AudioConfig {
  sampleRate: number
  channels: number
}
