import { useEffect, useCallback } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';

type InputMode = 'push-to-talk' | 'toggle' | 'voice-active';

interface VoicePillProps {
  isConnected: boolean;
  isReady?: boolean;
  isMicActive: boolean;
  isAgentSpeaking: boolean;
  currentTranscript: string;
  userAudioLevel: number;
  agentAudioLevel: number;
  inputMode?: InputMode;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartTalking: () => void;
  onStopTalking: () => void;
  onToggleMic?: () => void;
}

export default function VoicePill({
  isConnected,
  isReady = true,
  isMicActive,
  isAgentSpeaking,
  currentTranscript,
  userAudioLevel,
  agentAudioLevel,
  inputMode = 'toggle',
  onConnect,
  onDisconnect,
  onStartTalking,
  onStopTalking,
  onToggleMic,
}: VoicePillProps) {
  // Keyboard shortcuts based on input mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isConnected || !isReady || isInputFocused()) return;

    if (inputMode === 'push-to-talk' && e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      onStartTalking();
    } else if (inputMode === 'toggle' && e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      onToggleMic?.();
    }
  }, [isConnected, isReady, inputMode, onStartTalking, onToggleMic]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!isConnected || !isReady || isInputFocused()) return;

    if (inputMode === 'push-to-talk' && e.code === 'Space') {
      e.preventDefault();
      onStopTalking();
    }
  }, [isConnected, isReady, inputMode, onStopTalking]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Not connected: show small idle mic button
  if (!isConnected) {
    return (
      <button
        onClick={onConnect}
        className="flex-shrink-0 w-9 h-9 rounded-full border border-[var(--glass-border)] flex items-center justify-center transition-colors text-text-tertiary hover:text-text-secondary hover:border-primary/50"
        title="Start voice session"
      >
        <Mic size={16} />
      </button>
    );
  }

  // Connected but not ready — show loading state
  if (!isReady) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full border border-primary/30 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
        <span className="text-text-tertiary text-xs">Connecting...</span>
      </div>
    );
  }

  // Connected and ready
  const isActive = isMicActive || isAgentSpeaking;
  const glowColor = isAgentSpeaking ? 'shadow-[0_0_20px_rgba(59,191,178,0.3)]' : 'shadow-[0_0_20px_rgba(0,229,255,0.3)]';
  const borderColor = isAgentSpeaking ? 'border-muted-teal/50' : 'border-primary/50';

  // Click/touch handlers depend on input mode
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
    : {}; // voice-active: no manual control needed

  const modeLabel = inputMode === 'push-to-talk'
    ? 'Hold to talk'
    : inputMode === 'toggle'
    ? (isMicActive ? 'Click to mute' : 'Click to talk')
    : 'Listening...';

  return (
    <div className="flex items-center gap-3 relative">
      {/* Disconnect button */}
      <button
        onClick={onDisconnect}
        className="flex-shrink-0 w-7 h-7 rounded-full border border-danger/30 flex items-center justify-center text-danger/60 hover:text-danger hover:border-danger transition-colors"
        title="End voice session"
      >
        <X size={12} />
      </button>

      {/* Main mic button */}
      <div className="relative flex items-center justify-center">
        {/* Pulse rings when active */}
        {isActive && (
          <>
            <div className="absolute w-24 h-24 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '0s' }} />
            <div className="absolute w-24 h-24 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
            <div className="absolute w-24 h-24 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '1s' }} />
          </>
        )}

        {/* Audio visualizers */}
        {isActive && (
          <>
            <AudioVisualizer side="left" level={isMicActive ? userAudioLevel : agentAudioLevel} />
            <AudioVisualizer side="right" level={isMicActive ? userAudioLevel : agentAudioLevel} />
          </>
        )}

        {/* Inner pulse */}
        {isActive && (
          <div className="absolute w-16 h-16 rounded-full bg-primary/10 animate-pulse" />
        )}

        {/* Mic button */}
        <button
          {...micHandlers}
          className={`relative z-10 w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all bg-surface/80 backdrop-blur-sm ${borderColor} ${glowColor}`}
          title={modeLabel}
        >
          {isMicActive ? (
            <Mic size={20} className="text-primary" />
          ) : (
            <MicOff size={20} className={isAgentSpeaking ? 'text-muted-teal' : 'text-text-secondary'} />
          )}
        </button>
      </div>

      {/* Status + transcript */}
      <div className="flex-1 min-w-0">
        {currentTranscript ? (
          <p className="text-text-secondary text-xs truncate">
            {currentTranscript}
            <span className="inline-block w-1.5 h-3 bg-primary/70 ml-0.5 animate-cursor-blink" />
          </p>
        ) : (
          <p className="text-text-tertiary text-[10px] tracking-wider uppercase">{modeLabel}</p>
        )}
      </div>
    </div>
  );
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}
