import { useRef, useEffect } from 'react';
import { useConversationStore } from '../../stores/conversation';
import { MessageBubble } from './MessageBubble';
import { ConversationActionCard } from './ActionCard';
import { Send, ChevronDown } from 'lucide-react';
import { useLiveKitVoice } from '../../hooks/useLiveKitVoice';
import VoicePill from '../VoicePill/VoicePill';
import VoiceOverlay from '../VoicePill/VoiceOverlay';

export default function ConversationRail() {
  const {
    messages,
    isExpanded,
    inputValue,
    setInputValue,
    toggleExpanded,
    setExpanded,
    sendMessage,
    sendMessageWithAttachments,
    addVoiceMessage,
    projectId,
    projectName,
  } = useConversationStore();

  const voice = useLiveKitVoice();

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll thread to bottom
  useEffect(() => {
    if (threadRef.current && isExpanded) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  // When final voice transcripts arrive, add them to the conversation thread
  const lastQueueLenRef = useRef(0);
  useEffect(() => {
    if (voice.transcriptQueue.length > lastQueueLenRef.current) {
      const newEntries = voice.transcriptQueue.slice(lastQueueLenRef.current);
      for (const entry of newEntries) {
        addVoiceMessage(entry.role, entry.text);
      }
    }
    lastQueueLenRef.current = voice.transcriptQueue.length;
  }, [voice.transcriptQueue]);

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

  const handleVoiceConnect = async () => {
    await voice.connect(undefined, projectId || undefined);
    setExpanded(true);
  };

  const handleVoiceTextMessage = (content: string) => {
    if (voice.isConnected && voice.sendTextMessage) {
      voice.sendTextMessage(content);
      addVoiceMessage('user', content);
    } else {
      sendMessage(content);
    }
  };

  const handleVoiceFileUpload = (file: File, content: string) => {
    sendMessageWithAttachments(content, [file]);
  };

  const isVoiceActive = voice.isConnected;

  return (
    <>
      {/* Full-screen Voice Overlay */}
      <VoiceOverlay
        isConnected={voice.isConnected}
        isMicActive={voice.isMicActive}
        isAgentSpeaking={voice.isAgentSpeaking}
        currentTranscript={voice.currentTranscript}
        userAudioLevel={voice.userAudioLevel}
        agentAudioLevel={voice.agentAudioLevel}
        recentMessages={messages}
        inputMode={voice.inputMode}
        onDisconnect={() => { voice.disconnect(); setExpanded(false); }}
        onStartTalking={voice.startTalking}
        onStopTalking={voice.stopTalking}
        onToggleMic={voice.toggleMic}
        onSendTextMessage={handleVoiceTextMessage}
        onFileUpload={handleVoiceFileUpload}
        deepMode={voice.deepMode}
        onToggleDeepMode={() => voice.setDeepMode(!voice.deepMode)}
      />

      {/* Backdrop overlay when expanded (non-voice) */}
      {isExpanded && !isVoiceActive && (
        <div
          className="fixed inset-0 z-30 bg-base/70 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Thread overlay (text mode only — voice uses VoiceOverlay) */}
      {isExpanded && !isVoiceActive && (
        <div className="fixed bottom-16 left-0 md:left-12 right-0 z-40 max-h-[60vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-[var(--glass-border)]">
            <span className="text-text-secondary text-xs font-semibold tracking-wider uppercase">
              Conversation
            </span>
            <button onClick={() => setExpanded(false)} className="text-text-tertiary hover:text-text-secondary">
              <ChevronDown size={16} />
            </button>
          </div>
          <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-3 bg-surface/95 backdrop-blur-xl">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} role={msg.role} content={msg.content} timestamp={msg.timestamp} attachments={msg.attachments}>
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
            {/* Live transcript display */}
            {voice.currentTranscript && isVoiceActive && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-elevated/50 border border-[var(--glass-border)] animate-fade-in">
                <p className="text-text-secondary text-xs">
                  {voice.currentTranscript}
                  <span className="inline-block w-1.5 h-3 bg-primary/70 ml-0.5 animate-cursor-blink" />
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="fixed bottom-14 md:bottom-0 left-0 md:left-12 right-0 z-40 bg-surface border-t border-[var(--glass-border)]">
        {/* Last Nitara message compact bar */}
        {!isExpanded && lastNitaraMessage && (
          <button
            onClick={toggleExpanded}
            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-elevated/30 transition-colors"
          >
            <span className="text-primary text-xs">{'\u2726'}</span>
            <span className="text-text-secondary text-xs truncate flex-1">
              Nitara: {lastNitaraMessage.content}
            </span>
          </button>
        )}

        {/* Project context indicator */}
        {projectId && projectName && (
          <div className="px-3 py-1 text-[10px] tracking-wider uppercase text-primary/80 border-b border-[var(--glass-border)] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Discussing: {projectName} // DEEP MODE
          </div>
        )}

        {/* Input bar */}
        <div className="flex items-end gap-2 px-3 py-2">
          {/* Voice Pill */}
          <VoicePill
            isConnected={voice.isConnected}
            isReady={voice.isReady}
            isMicActive={voice.isMicActive}
            isAgentSpeaking={voice.isAgentSpeaking}
            currentTranscript={voice.currentTranscript}
            userAudioLevel={voice.userAudioLevel}
            agentAudioLevel={voice.agentAudioLevel}
            inputMode={voice.inputMode}
            onConnect={handleVoiceConnect}
            onDisconnect={voice.disconnect}
            onStartTalking={voice.startTalking}
            onStopTalking={voice.stopTalking}
            onToggleMic={voice.toggleMic}
          />

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
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
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
