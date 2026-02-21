import { useState, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Send, Paperclip, X, Keyboard, Zap } from 'lucide-react';
import { MessageBubble } from '../ConversationRail/MessageBubble';
import type { ConversationMessage } from '../../stores/conversation';

type InputMode = 'push-to-talk' | 'toggle' | 'voice-active';

interface VoiceOverlayProps {
  isConnected: boolean;
  isMicActive: boolean;
  isAgentSpeaking: boolean;
  currentTranscript: string;
  userAudioLevel: number;
  agentAudioLevel: number;
  recentMessages: ConversationMessage[];
  inputMode?: InputMode;
  onDisconnect: () => void;
  onStartTalking: () => void;
  onStopTalking: () => void;
  onToggleMic?: () => void;
  onSendTextMessage?: (content: string) => void;
  onFileUpload?: (file: File, content: string) => void;
  isSending?: boolean;
  deepMode?: boolean;
  onToggleDeepMode?: () => void;
}

export default function VoiceOverlay({
  isConnected,
  isMicActive,
  isAgentSpeaking,
  currentTranscript,
  userAudioLevel,
  agentAudioLevel,
  recentMessages,
  inputMode = 'toggle',
  onDisconnect,
  onStartTalking,
  onStopTalking,
  onToggleMic,
  onSendTextMessage,
  onFileUpload,
  isSending,
  deepMode,
  onToggleDeepMode,
}: VoiceOverlayProps) {
  const [textValue, setTextValue] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isConnected) return null;

  const handleTextSend = () => {
    const trimmed = textValue.trim();
    if (!trimmed && !pendingFile) return;
    if (pendingFile && onFileUpload) {
      onFileUpload(pendingFile, trimmed);
    } else if (trimmed && onSendTextMessage) {
      onSendTextMessage(trimmed);
    }
    setTextValue('');
    setPendingFile(null);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const isActive = isMicActive || isAgentSpeaking;
  const activeLevel = isMicActive ? userAudioLevel : agentAudioLevel;
  const glowColor = isAgentSpeaking
    ? 'shadow-[0_0_40px_rgba(59,191,178,0.4)]'
    : isMicActive
    ? 'shadow-[0_0_40px_rgba(0,229,255,0.4)]'
    : '';
  const borderColor = isAgentSpeaking
    ? 'border-muted-teal'
    : isMicActive
    ? 'border-primary'
    : 'border-text-tertiary/40';

  const last3 = recentMessages.slice(-3);

  // Mic button handlers based on input mode
  const micHandlers = inputMode === 'push-to-talk'
    ? {
        onMouseDown: onStartTalking,
        onMouseUp: onStopTalking,
        onMouseLeave: () => { if (isMicActive) onStopTalking(); },
        onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); onStartTalking(); },
        onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); onStopTalking(); },
      }
    : inputMode === 'toggle'
    ? {
        onClick: onToggleMic,
      }
    : {};

  const hintText = inputMode === 'push-to-talk'
    ? 'Hold spacebar or press the mic to talk'
    : inputMode === 'toggle'
    ? (isMicActive ? 'Press spacebar or click mic to mute' : 'Press spacebar or click mic to talk')
    : 'Listening...';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-base/85 backdrop-blur-lg">
      {/* Disconnect button — top right */}
      <button
        onClick={onDisconnect}
        className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 px-4 py-2 rounded-full border border-danger/30 text-danger/70 hover:text-danger hover:border-danger transition-colors text-sm"
      >
        <PhoneOff size={16} />
        <span>End</span>
      </button>

      {/* Status label + deep mode toggle */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-3">
        <p className="text-text-tertiary text-xs tracking-wider uppercase">
          {isAgentSpeaking ? 'Nitara is speaking...' : isMicActive ? 'Listening...' : 'Voice Session Active'}
        </p>
        {onToggleDeepMode && (
          <button
            onClick={onToggleDeepMode}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase transition-all ${
              deepMode
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-surface/40 text-text-tertiary border border-[var(--glass-border)] hover:text-text-secondary hover:bg-surface/60'
            }`}
            title={deepMode ? 'Deep mode active — Opus model, full context' : 'Enable deep mode for strategic depth'}
          >
            <Zap size={10} className={deepMode ? 'text-amber-400' : ''} />
            <span>Deep{deepMode ? ' ON' : ''}</span>
          </button>
        )}
      </div>

      {/* Recent conversation cards floating above */}
      {last3.length > 0 && (
        <div className="w-full max-w-lg px-6 mb-8 space-y-2 max-h-[30vh] overflow-y-auto">
          {last3.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
            />
          ))}
        </div>
      )}

      {/* Center mic area */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Pulse rings */}
        {isActive && (
          <>
            <div className="absolute w-28 h-28 md:w-40 md:h-40 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '0s' }} />
            <div className="absolute w-28 h-28 md:w-40 md:h-40 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
            <div className="absolute w-28 h-28 md:w-40 md:h-40 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '1s' }} />
          </>
        )}

        {/* Left audio visualizer bars */}
        <div className="absolute -left-12 md:-left-20 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {[16, 24, 32, 40].reverse().map((h, i) => {
            const scaledH = Math.max(10, h * (0.3 + activeLevel * 0.7));
            return (
              <div
                key={i}
                className={`w-1.5 rounded-full opacity-60 ${isAgentSpeaking ? 'bg-muted-teal' : 'bg-primary'}`}
                style={{
                  height: `${scaledH}px`,
                  animation: activeLevel > 0.01 ? 'pulse 0.6s ease-in-out infinite' : 'none',
                  animationDelay: `${i * 0.1}s`,
                  transition: 'height 0.15s ease',
                }}
              />
            );
          })}
        </div>

        {/* Right audio visualizer bars */}
        <div className="absolute -right-12 md:-right-20 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {[16, 24, 32, 40].map((h, i) => {
            const scaledH = Math.max(10, h * (0.3 + activeLevel * 0.7));
            return (
              <div
                key={i}
                className={`w-1.5 rounded-full opacity-60 ${isAgentSpeaking ? 'bg-muted-teal' : 'bg-primary'}`}
                style={{
                  height: `${scaledH}px`,
                  animation: activeLevel > 0.01 ? 'pulse 0.6s ease-in-out infinite' : 'none',
                  animationDelay: `${i * 0.1}s`,
                  transition: 'height 0.15s ease',
                }}
              />
            );
          })}
        </div>

        {/* Inner glow */}
        {isActive && (
          <div className={`absolute w-28 h-28 rounded-full animate-pulse ${isAgentSpeaking ? 'bg-muted-teal/10' : 'bg-primary/10'}`} />
        )}

        {/* Mic button */}
        <button
          {...micHandlers}
          className={`relative z-10 w-16 h-16 md:w-20 md:h-20 rounded-full border-2 flex items-center justify-center transition-all bg-surface/80 backdrop-blur-sm ${borderColor} ${glowColor}`}
          title={inputMode === 'push-to-talk' ? 'Hold to talk' : inputMode === 'toggle' ? (isMicActive ? 'Click to mute' : 'Click to talk') : 'Listening'}
        >
          {isMicActive ? (
            <Mic size={28} className="text-primary" />
          ) : (
            <MicOff size={28} className={isAgentSpeaking ? 'text-muted-teal' : 'text-text-secondary'} />
          )}
        </button>
      </div>

      {/* Live transcript */}
      <div className="w-full max-w-lg px-6 text-center min-h-[3rem]">
        {currentTranscript ? (
          <p className="text-text-primary text-lg leading-relaxed">
            {currentTranscript}
            <span className="inline-block w-2 h-5 bg-primary/70 ml-1 animate-cursor-blink align-text-bottom" />
          </p>
        ) : (
          <p className="text-text-tertiary text-sm">
            {isMicActive ? 'Speak now...' : hintText}
          </p>
        )}
      </div>

      {/* Text input bar */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6">
        <div className="w-full max-w-lg">
          {!showTextInput ? (
            <button
              onClick={() => setShowTextInput(true)}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-surface/40 backdrop-blur-md border border-[var(--glass-border)] text-text-tertiary hover:text-text-secondary hover:bg-surface/60 transition-colors text-xs"
            >
              <Keyboard size={14} />
              <span>Type a message</span>
            </button>
          ) : (
            <div className="bg-surface/40 backdrop-blur-md border border-[var(--glass-border)] rounded-2xl p-2">
              {/* Pending file chip */}
              {pendingFile && (
                <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-elevated/40 rounded-lg text-xs">
                  <Paperclip size={12} className="text-primary flex-shrink-0" />
                  <span className="text-text-secondary truncate flex-1">{pendingFile.name}</span>
                  <span className="text-text-tertiary flex-shrink-0">{formatFileSize(pendingFile.size)}</span>
                  <button onClick={() => setPendingFile(null)} className="text-text-tertiary hover:text-danger flex-shrink-0">
                    <X size={12} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                {/* File attachment button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-primary transition-colors"
                >
                  <Paperclip size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {/* Text input */}
                <textarea
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={handleTextKeyDown}
                  placeholder="Type while talking..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder-text-tertiary outline-none min-h-[32px] max-h-[80px]"
                  style={{ fieldSizing: 'content' } as React.CSSProperties}
                />
                {/* Send button */}
                <button
                  onClick={handleTextSend}
                  disabled={isSending || (!textValue.trim() && !pendingFile)}
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    textValue.trim() || pendingFile
                      ? 'bg-primary text-base hover:bg-primary/80'
                      : 'text-text-tertiary'
                  }`}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
