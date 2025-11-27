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

// Action types for agent responses
export interface CheckAvailabilityAction {
  action: 'CHECK_AVAILABILITY'
  time: string // Format: "HH:mm" (e.g., "12:00")
}

export type AgentAction = CheckAvailabilityAction

// API response types
export interface CheckReservationResponse {
  available: boolean
  time: string
  message?: string
}
