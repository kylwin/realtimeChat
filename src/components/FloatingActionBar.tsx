import type { ConversationState } from '@/types'

interface FloatingActionBarProps {
  conversationState: ConversationState
  onEndConversation: () => void
}

export default function FloatingActionBar({
  conversationState,
  onEndConversation
}: FloatingActionBarProps) {
  const stateConfig = {
    idle: { label: 'Ready', color: 'bg-gray-400' },
    listening: { label: 'Listening...', color: 'bg-primary' },
    processing: { label: 'Processing...', color: 'bg-warning' },
    responding: { label: 'Responding...', color: 'bg-success' }
  }

  const config = stateConfig[conversationState]
  const isActive = conversationState !== 'idle'

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-gray-200">
      {/* Status Indicator */}
      <div className="flex items-center gap-2 min-w-[100px]">
        <div
          className={`w-3 h-3 rounded-full ${config.color} transition-all duration-300 ${
            isActive ? 'animate-pulse' : ''
          }`}
        />
        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{config.label}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />

      {/* End Conversation Button */}
      <button
        onClick={onEndConversation}
        className="text-error hover:text-red-600 hover:bg-red-50 rounded-full px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap"
      >
        <span className="flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          End
        </span>
      </button>
    </div>
  )
}
