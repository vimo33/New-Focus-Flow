import { useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff, PhoneOff, Send, Shield, Check, X, AlertTriangle,
  Clock, ArrowLeft, Zap, Keyboard, Radio,
} from 'lucide-react';
import { useLiveKitVoice } from '../../hooks/useLiveKitVoice';
import { useApprovalStore, type Approval } from '../../stores/approval';
import { useConversationStore } from '../../stores/conversation';
import { useCanvasStore } from '../../stores/canvas';
import { MessageBubble } from '../ConversationRail/MessageBubble';

// -- Voice state labels --
type VoicePhase = 'idle' | 'listening' | 'processing' | 'speaking';

function getVoicePhase(
  isConnected: boolean,
  isMicActive: boolean,
  isAgentSpeaking: boolean,
  currentTranscript: string,
): VoicePhase {
  if (!isConnected) return 'idle';
  if (isAgentSpeaking) return 'speaking';
  if (!isMicActive && currentTranscript) return 'processing';
  if (isMicActive) return 'listening';
  return 'idle';
}

const PHASE_CONFIG: Record<VoicePhase, { label: string; color: string; ringColor: string; glowClass: string }> = {
  idle:       { label: 'Awaiting Input',  color: 'text-text-tertiary', ringColor: 'border-text-tertiary/40', glowClass: '' },
  listening:  { label: 'Listening...',     color: 'text-primary',       ringColor: 'border-primary',          glowClass: 'shadow-[0_0_40px_rgba(0,229,255,0.35)]' },
  processing: { label: 'Processing...',   color: 'text-secondary',     ringColor: 'border-secondary',        glowClass: 'shadow-[0_0_40px_rgba(167,139,250,0.35)]' },
  speaking:   { label: 'Nitara Speaking', color: 'text-muted-teal',    ringColor: 'border-muted-teal',       glowClass: 'shadow-[0_0_40px_rgba(59,191,178,0.35)]' },
};

// -- Approval tier styling --
const TIER_STYLES: Record<string, { bg: string; text: string; label: string; icon: typeof Shield }> = {
  tier1: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Tier 1 - Auto', icon: Check },
  tier2: { bg: 'bg-amber-500/20',   text: 'text-amber-400',   label: 'Tier 2 - Soft Gate', icon: AlertTriangle },
  tier3: { bg: 'bg-red-500/20',     text: 'text-red-400',     label: 'Tier 3 - Hard Gate', icon: Shield },
};

// -- Inline Approval Card --
function InlineApprovalCard({ approval }: { approval: Approval }) {
  const tier = TIER_STYLES[approval.riskTier] || TIER_STYLES.tier2;
  const TierIcon = tier.icon;
  const { approveItem, rejectItem } = useApprovalStore();
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    setActing('approve');
    await approveItem(approval.id);
    setActing(null);
  };

  const handleReject = async () => {
    setActing('reject');
    await rejectItem(approval.id);
    setActing(null);
  };

  return (
    <div className="bg-[rgba(15,10,20,0.55)] backdrop-blur-md border border-white/8 rounded-xl p-4 transition-all hover:border-white/15">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TierIcon size={13} className={tier.text} />
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${tier.bg} ${tier.text} flex-shrink-0`}>
            {tier.label}
          </span>
        </div>
        <span className="flex items-center gap-1 text-text-tertiary text-[10px] flex-shrink-0">
          <Clock size={10} />
          {new Date(approval.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <p className="text-sm text-text-primary mb-1 leading-snug">{approval.actionSummary}</p>

      {approval.evidence && (
        <p className="text-xs text-text-tertiary mb-3 leading-relaxed line-clamp-2">{approval.evidence}</p>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <button
          onClick={handleApprove}
          disabled={!!acting}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
        >
          <Check size={12} /> {acting === 'approve' ? '...' : 'Approve'}
        </button>
        <button
          onClick={handleReject}
          disabled={!!acting}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-50"
        >
          <X size={12} /> {acting === 'reject' ? '...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

// -- Voice State Ring --
function VoiceStateRing({
  phase,
  audioLevel,
  isMicActive,
  inputMode,
  onStartTalking,
  onStopTalking,
  onToggleMic,
}: {
  phase: VoicePhase;
  audioLevel: number;
  isMicActive: boolean;
  inputMode: string;
  onStartTalking: () => void;
  onStopTalking: () => void;
  onToggleMic?: () => void;
}) {
  const config = PHASE_CONFIG[phase];
  const isActive = phase === 'listening' || phase === 'speaking';

  const micHandlers = inputMode === 'push-to-talk'
    ? {
        onMouseDown: onStartTalking,
        onMouseUp: onStopTalking,
        onMouseLeave: () => { if (isMicActive) onStopTalking(); },
        onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); onStartTalking(); },
        onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); onStopTalking(); },
      }
    : inputMode === 'toggle'
    ? { onClick: onToggleMic }
    : {};

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Pulse rings when active */}
        {isActive && (
          <>
            <div className="absolute w-28 h-28 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '0s' }} />
            <div className="absolute w-28 h-28 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
            <div className="absolute w-28 h-28 rounded-full bg-primary/5 animate-pulse-ring" style={{ animationDelay: '1s' }} />
          </>
        )}

        {/* Audio level bars — left */}
        {isActive && (
          <div className="absolute -left-14 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {[12, 18, 26, 34].reverse().map((h, i) => {
              const scaledH = Math.max(8, h * (0.3 + audioLevel * 0.7));
              return (
                <div
                  key={i}
                  className={`w-1.5 rounded-full opacity-50 ${phase === 'speaking' ? 'bg-muted-teal' : 'bg-primary'}`}
                  style={{
                    height: `${scaledH}px`,
                    animation: audioLevel > 0.01 ? 'pulse 0.6s ease-in-out infinite' : 'none',
                    animationDelay: `${i * 0.1}s`,
                    transition: 'height 0.15s ease',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Audio level bars — right */}
        {isActive && (
          <div className="absolute -right-14 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {[12, 18, 26, 34].map((h, i) => {
              const scaledH = Math.max(8, h * (0.3 + audioLevel * 0.7));
              return (
                <div
                  key={i}
                  className={`w-1.5 rounded-full opacity-50 ${phase === 'speaking' ? 'bg-muted-teal' : 'bg-primary'}`}
                  style={{
                    height: `${scaledH}px`,
                    animation: audioLevel > 0.01 ? 'pulse 0.6s ease-in-out infinite' : 'none',
                    animationDelay: `${i * 0.1}s`,
                    transition: 'height 0.15s ease',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Inner glow */}
        {isActive && (
          <div className={`absolute w-20 h-20 rounded-full animate-pulse ${phase === 'speaking' ? 'bg-muted-teal/10' : 'bg-primary/10'}`} />
        )}

        {/* Mic button */}
        <button
          {...micHandlers}
          className={`relative z-10 w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all bg-surface/80 backdrop-blur-sm ${config.ringColor} ${config.glowClass}`}
          title={inputMode === 'push-to-talk' ? 'Hold to talk' : isMicActive ? 'Click to mute' : 'Click to talk'}
        >
          {phase === 'processing' ? (
            <div className="w-5 h-5 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
          ) : isMicActive ? (
            <Mic size={24} className="text-primary" />
          ) : (
            <MicOff size={24} className={phase === 'speaking' ? 'text-muted-teal' : 'text-text-secondary'} />
          )}
        </button>
      </div>

      {/* Phase label */}
      <span className={`text-xs font-semibold tracking-wider uppercase ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}

// ===== Main Component =====
export default function VoiceConsoleCanvas() {
  const voice = useLiveKitVoice();
  const { approvals, pendingCount, fetchApprovals } = useApprovalStore();
  const { messages, addVoiceMessage, sendMessage } = useConversationStore();
  const { goBack } = useCanvasStore();

  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const lastQueueLenRef = useRef(0);

  const pending = approvals.filter(a => a.status === 'pending');
  const phase = getVoicePhase(voice.isConnected, voice.isMicActive, voice.isAgentSpeaking, voice.currentTranscript);
  const activeLevel = voice.isMicActive ? voice.userAudioLevel : voice.agentAudioLevel;

  // Auto-connect voice on mount
  useEffect(() => {
    if (!voice.isConnected) {
      voice.connect().catch(console.error);
    }
    fetchApprovals();
  }, []);

  // Poll approvals every 30s
  useEffect(() => {
    const interval = setInterval(fetchApprovals, 30000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  // Pipe voice transcript queue into conversation store
  useEffect(() => {
    if (voice.transcriptQueue.length > lastQueueLenRef.current) {
      const newEntries = voice.transcriptQueue.slice(lastQueueLenRef.current);
      for (const entry of newEntries) {
        addVoiceMessage(entry.role, entry.text);
      }
    }
    lastQueueLenRef.current = voice.transcriptQueue.length;
  }, [voice.transcriptQueue, addVoiceMessage]);

  // Auto-scroll conversation
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTextSend = () => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    if (voice.isConnected) {
      voice.sendTextMessage(trimmed);
      addVoiceMessage('user', trimmed);
    } else {
      sendMessage(trimmed);
    }
    setTextInput('');
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSend();
    }
  };

  const handleDisconnect = () => {
    voice.disconnect();
    goBack();
  };

  return (
    <div data-testid="canvas-voice-console" className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="w-8 h-8 rounded-lg border border-[var(--glass-border)] flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-elevated/30 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <Radio size={16} className={voice.isConnected ? 'text-primary' : 'text-text-tertiary'} />
            <h1 className="text-lg font-bold text-text-primary">Voice Console</h1>
          </div>
          {voice.isConnected && (
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold tracking-wider uppercase">
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Deep mode toggle */}
          <button
            onClick={() => voice.setDeepMode(!voice.deepMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wider uppercase transition-all ${
              voice.deepMode
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-surface/40 text-text-tertiary border border-[var(--glass-border)] hover:text-text-secondary'
            }`}
          >
            <Zap size={10} />
            Deep{voice.deepMode ? ' ON' : ''}
          </button>

          {/* Approval count badge */}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">
              <Shield size={10} />
              {pendingCount}
            </span>
          )}

          {/* End session */}
          {voice.isConnected && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-danger/30 text-danger/70 hover:text-danger hover:border-danger transition-colors text-xs"
            >
              <PhoneOff size={14} />
              End
            </button>
          )}
        </div>
      </div>

      {/* Main content — 2 panels */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] min-h-0">
        {/* LEFT: Voice + Conversation */}
        <div className="flex flex-col min-h-0 border-r border-[var(--glass-border)]">
          {/* Voice state indicator — centered area */}
          <div className="flex items-center justify-center py-8 border-b border-[var(--glass-border)] bg-base/30">
            {voice.isConnected ? (
              <VoiceStateRing
                phase={phase}
                audioLevel={activeLevel}
                isMicActive={voice.isMicActive}
                inputMode={voice.inputMode}
                onStartTalking={voice.startTalking}
                onStopTalking={voice.stopTalking}
                onToggleMic={voice.toggleMic}
              />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={() => voice.connect().catch(console.error)}
                  className="w-16 h-16 rounded-full border-2 border-primary/40 flex items-center justify-center bg-surface/80 hover:border-primary hover:shadow-[0_0_30px_rgba(0,229,255,0.2)] transition-all"
                >
                  <Mic size={24} className="text-primary" />
                </button>
                <span className="text-xs text-text-tertiary tracking-wider uppercase">
                  Click to start voice session
                </span>
              </div>
            )}
          </div>

          {/* Live transcript display */}
          {voice.currentTranscript && (
            <div className="px-6 py-3 border-b border-[var(--glass-border)] bg-elevated/20">
              <p className="text-text-primary text-sm text-center">
                {voice.currentTranscript}
                <span className="inline-block w-2 h-4 bg-primary/70 ml-1 animate-cursor-blink align-text-bottom" />
              </p>
            </div>
          )}

          {/* Conversation thread */}
          <div ref={threadRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Radio size={28} className="text-text-tertiary/40 mb-3" />
                <p className="text-text-tertiary text-sm">Voice session conversation will appear here</p>
                <p className="text-text-tertiary/60 text-xs mt-1">Speak or type to start</p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
              ))
            )}
          </div>

          {/* Text input bar */}
          <div className="border-t border-[var(--glass-border)] px-4 py-3">
            {!showTextInput ? (
              <button
                onClick={() => setShowTextInput(true)}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-surface/40 border border-[var(--glass-border)] text-text-tertiary hover:text-text-secondary hover:bg-surface/60 transition-colors text-xs"
              >
                <Keyboard size={14} />
                Type a message
              </button>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleTextKeyDown}
                  placeholder="Type while talking..."
                  rows={1}
                  autoFocus
                  className="flex-1 resize-none bg-elevated/50 border border-[var(--glass-border)] rounded-xl px-4 py-2 text-sm text-text-primary placeholder-text-tertiary outline-none min-h-[36px] max-h-[80px]"
                  style={{ fieldSizing: 'content' } as React.CSSProperties}
                />
                <button
                  onClick={handleTextSend}
                  disabled={!textInput.trim()}
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    textInput.trim()
                      ? 'bg-primary text-base hover:bg-primary/80'
                      : 'bg-elevated text-text-tertiary'
                  }`}
                >
                  <Send size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Approvals Stream */}
        <div className="flex flex-col min-h-0 bg-base/20">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-text-secondary tracking-wider uppercase">
                Approval Stream
              </span>
            </div>
            <span className="text-[10px] text-text-tertiary">
              {pendingCount} pending
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Shield size={28} className="text-text-tertiary/30 mb-3" />
                <p className="text-text-tertiary text-sm">No pending approvals</p>
                <p className="text-text-tertiary/60 text-xs mt-1">
                  Agent actions requiring review will stream here
                </p>
              </div>
            ) : (
              pending.map((approval) => (
                <InlineApprovalCard key={approval.id} approval={approval} />
              ))
            )}
          </div>

          {/* Voice hint for approvals */}
          {voice.isConnected && pending.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[var(--glass-border)] text-[10px] text-text-tertiary text-center">
              Say <kbd className="px-1.5 py-0.5 bg-elevated rounded border border-[var(--glass-border)] font-mono">"approve that"</kbd> or{' '}
              <kbd className="px-1.5 py-0.5 bg-elevated rounded border border-[var(--glass-border)] font-mono">"reject that"</kbd> to act by voice
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
