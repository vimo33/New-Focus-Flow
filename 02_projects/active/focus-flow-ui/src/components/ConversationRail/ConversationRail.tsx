import { useRef, useEffect } from 'react';
import { useConversationStore } from '../../stores/conversation';
import { MessageBubble } from './MessageBubble';
import { ConversationActionCard } from './ActionCard';
import { Mic, Send, ChevronDown } from 'lucide-react';

export default function ConversationRail() {
  const {
    messages,
    isExpanded,
    isRecording,
    inputValue,
    setInputValue,
    toggleExpanded,
    setExpanded,
    setRecording,
    sendMessage,
  } = useConversationStore();

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll thread to bottom
  useEffect(() => {
    if (threadRef.current && isExpanded) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  const lastNitaraMessage = [...messages].reverse().find((m) => m.role === 'nitara');

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop overlay when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-30 bg-base/70 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Thread overlay */}
      {isExpanded && (
        <div className="fixed bottom-16 left-12 right-0 z-40 max-h-[60vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-[var(--glass-border)]">
            <span className="text-text-secondary text-xs font-semibold tracking-wider uppercase">Conversation</span>
            <button onClick={() => setExpanded(false)} className="text-text-tertiary hover:text-text-secondary">
              <ChevronDown size={16} />
            </button>
          </div>
          <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-3 bg-surface/95 backdrop-blur-xl">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} role={msg.role} content={msg.content} timestamp={msg.timestamp}>
                {msg.cards?.map((card, i) => (
                  <ConversationActionCard
                    key={i}
                    title={card.title}
                    description={card.description}
                    accent={card.accent}
                    actions={card.actions.map((a) => ({ ...a, onClick: () => {} }))}
                  />
                ))}
              </MessageBubble>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-12 right-0 z-40 bg-surface border-t border-[var(--glass-border)]">
        {/* Last Nitara message compact bar */}
        {!isExpanded && lastNitaraMessage && (
          <button
            onClick={toggleExpanded}
            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-elevated/30 transition-colors"
          >
            <span className="text-primary text-xs">✦</span>
            <span className="text-text-secondary text-xs truncate flex-1">
              Nitara: {lastNitaraMessage.content}
            </span>
          </button>
        )}

        {/* Input bar */}
        <div className="flex items-end gap-2 px-3 py-2">
          {/* Mic button */}
          <button
            onClick={() => setRecording(!isRecording)}
            className={`flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
              isRecording
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-[var(--glass-border)] text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Mic size={16} />
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Nitara..."
            rows={1}
            className="flex-1 resize-none bg-elevated/50 border rounded-xl px-4 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none animate-breathe min-h-[36px] max-h-[96px]"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              inputValue.trim()
                ? 'bg-primary text-base hover:bg-primary/80'
                : 'bg-elevated text-text-tertiary'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
