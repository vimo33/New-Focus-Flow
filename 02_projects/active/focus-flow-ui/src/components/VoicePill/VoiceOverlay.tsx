import { Mic, MicOff, PhoneOff } from 'lucide-react';
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
}: VoiceOverlayProps) {
  if (!isConnected) return null;

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
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full border border-danger/30 text-danger/70 hover:text-danger hover:border-danger transition-colors text-sm"
      >
        <PhoneOff size={16} />
        <span>End</span>
      </button>

      {/* Status label */}
      <div className="absolute top-6 left-6">
        <p className="text-text-tertiary text-xs tracking-wider uppercase">
          {isAgentSpeaking ? 'Nitara is speaking...' : isMicActive ? 'Listening...' : 'Voice Session Active'}
        </p>
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
            <div className="absolute w-40 h-40 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '0s' }} />
            <div className="absolute w-40 h-40 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
            <div className="absolute w-40 h-40 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '1s' }} />
          </>
        )}

        {/* Left audio visualizer bars */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 flex items-center gap-1">
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
        <div className="absolute -right-20 top-1/2 -translate-y-1/2 flex items-center gap-1">
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
          className={`relative z-10 w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all bg-surface/80 backdrop-blur-sm ${borderColor} ${glowColor}`}
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
    </div>
  );
}
