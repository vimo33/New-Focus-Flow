import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  DataPacket_Kind,
  Participant,
} from 'livekit-client';
import type { TranscriptionSegment } from 'livekit-client';
import { api } from '../services/api';
import { useCanvasStore } from '../stores/canvas';

type InputMode = 'push-to-talk' | 'toggle' | 'voice-active';

interface LiveKitVoiceState {
  isConnected: boolean;
  isReady: boolean;
  isMicActive: boolean;
  isAgentSpeaking: boolean;
  currentTranscript: string;
  agentTranscript: string;
  userTranscript: string;
  userAudioLevel: number;
  agentAudioLevel: number;
  transcriptQueue: Array<{ role: 'user' | 'nitara'; text: string }>;
  inputMode: InputMode;
  deepMode: boolean;
  setDeepMode: (enabled: boolean) => void;
  connect: (threadId?: string, projectId?: string) => Promise<void>;
  disconnect: () => void;
  startTalking: () => void;
  stopTalking: () => void;
  toggleMic: () => void;
  sendTextMessage: (text: string) => Promise<void>;
}

function getInputMode(): InputMode {
  const stored = localStorage.getItem('nitara-input-mode');
  if (stored === 'voice-active' || stored === 'toggle' || stored === 'push-to-talk') return stored;
  return 'toggle';
}

// Throttle threshold — only update state when audio level changes by this much
const LEVEL_THRESHOLD = 0.02;
// Audio level poll interval (250ms instead of 100ms — still smooth, 60% fewer re-renders)
const LEVEL_POLL_MS = 250;

export function useLiveKitVoice(): LiveKitVoiceState {
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [agentTranscript, setAgentTranscript] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [agentAudioLevel, setAgentAudioLevel] = useState(0);
  const [transcriptQueue, setTranscriptQueue] = useState<Array<{ role: 'user' | 'nitara'; text: string }>>([]);
  const [inputMode] = useState<InputMode>(getInputMode);
  const [deepMode, setDeepMode] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs for throttled audio level comparison
  const lastUserLevel = useRef(0);
  const lastAgentLevel = useRef(0);

  const cleanup = useCallback(() => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current.remove();
      audioElementRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    lastUserLevel.current = 0;
    lastAgentLevel.current = 0;
    setIsConnected(false);
    setIsReady(false);
    setIsMicActive(false);
    setIsAgentSpeaking(false);
    setCurrentTranscript('');
    setAgentTranscript('');
    setUserTranscript('');
    setUserAudioLevel(0);
    setAgentAudioLevel(0);
    setTranscriptQueue([]);
  }, []);

  const connect = useCallback(async (threadId?: string, projectId?: string) => {
    if (roomRef.current) {
      cleanup();
    }

    const voicePreset = localStorage.getItem('nitara-voice-preset') || 'nova';

    const tokenParams: Record<string, any> = { threadId, voicePreset };
    if (projectId) {
      tokenParams.projectId = projectId;
      tokenParams.deepMode = true;
      setDeepMode(true);
    }

    const { token, wsUrl } = await api.getLiveKitToken(tokenParams);

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    roomRef.current = room;

    // Handle remote audio tracks (agent TTS)
    room.on(RoomEvent.TrackSubscribed, (
      track: RemoteTrack,
      _pub: RemoteTrackPublication,
      _participant: RemoteParticipant
    ) => {
      if (track.kind === Track.Kind.Audio) {
        // Reuse existing element if present
        const existing = document.getElementById('livekit-agent-audio');
        if (existing) existing.remove();
        const el = track.attach();
        el.id = 'livekit-agent-audio';
        document.body.appendChild(el);
        audioElementRef.current = el;
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach(el => el.remove());
        audioElementRef.current = null;
      }
    });

    // Agent speaking detection
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const agentSpeaking = speakers.some(
        s => s.identity !== room.localParticipant.identity
      );
      setIsAgentSpeaking(agentSpeaking);
    });

    // Transcription from LiveKit Agents SDK
    room.on(RoomEvent.TranscriptionReceived, (
      segments: TranscriptionSegment[],
      participant?: Participant
    ) => {
      const text = segments.map(s => s.text).join(' ').trim();
      if (!text) return;

      const isAgent = participant?.identity !== room.localParticipant.identity;
      const isFinal = segments.some(s => s.final);

      // Set role-specific transcript (avoid cross-overwriting)
      if (isAgent) {
        setAgentTranscript(text);
        setCurrentTranscript(text);
      } else {
        setUserTranscript(text);
        setCurrentTranscript(text);
      }

      // Queue final transcripts for the conversation thread
      if (isFinal && text.length > 1) {
        // Clear the live transcript after a short delay so the final text doesn't linger
        setTimeout(() => setCurrentTranscript(''), 800);
        setTranscriptQueue(q => [...q, { role: isAgent ? 'nitara' : 'user', text }]);
      }
    });

    // Data messages fallback
    room.on(RoomEvent.DataReceived, (
      payload: Uint8Array,
      _participant?: RemoteParticipant,
      _kind?: DataPacket_Kind
    ) => {
      try {
        const decoded = new TextDecoder().decode(payload);
        const data = JSON.parse(decoded);
        if (data.type === 'transcript' && data.text) {
          setCurrentTranscript(data.text);
        } else if (data.type === 'open_canvas' && data.canvas) {
          useCanvasStore.getState().setCanvas(data.canvas, data.params || {});
        }
      } catch {
        // Ignore non-JSON data packets
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      cleanup();
    });

    await room.connect(wsUrl, token);
    setIsConnected(true);

    // Pre-create mic track. Use the published track event instead of arbitrary delay.
    try {
      await room.localParticipant.setMicrophoneEnabled(true);

      // For voice-active mode, keep mic on; otherwise mute after track is established
      if (getInputMode() === 'voice-active') {
        setIsMicActive(true);
      } else {
        // Small delay for WebRTC negotiation — reduced from 500ms
        await new Promise(resolve => setTimeout(resolve, 150));
        await room.localParticipant.setMicrophoneEnabled(false);
      }
    } catch (err) {
      console.warn('[Voice] Mic permission failed:', err);
    }

    setIsReady(true);

    // Poll audio levels — throttled to only trigger re-renders on significant changes
    levelIntervalRef.current = setInterval(() => {
      if (!roomRef.current) return;
      const local = roomRef.current.localParticipant;
      const newUserLevel = local.audioLevel || 0;

      if (Math.abs(newUserLevel - lastUserLevel.current) > LEVEL_THRESHOLD) {
        lastUserLevel.current = newUserLevel;
        setUserAudioLevel(newUserLevel);
      }

      const remoteParticipants = Array.from(roomRef.current.remoteParticipants.values());
      const newAgentLevel = remoteParticipants.reduce(
        (max, p) => Math.max(max, p.audioLevel || 0),
        0
      );

      if (Math.abs(newAgentLevel - lastAgentLevel.current) > LEVEL_THRESHOLD) {
        lastAgentLevel.current = newAgentLevel;
        setAgentAudioLevel(newAgentLevel);
      }
    }, LEVEL_POLL_MS);
  }, [cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const startTalking = useCallback(async () => {
    if (!roomRef.current || !isReady) return;
    await roomRef.current.localParticipant.setMicrophoneEnabled(true);
    setIsMicActive(true);
  }, [isReady]);

  const stopTalking = useCallback(async () => {
    if (!roomRef.current) return;
    await roomRef.current.localParticipant.setMicrophoneEnabled(false);
    setIsMicActive(false);
  }, []);

  const toggleMic = useCallback(async () => {
    if (!roomRef.current || !isReady) return;
    if (isMicActive) {
      await roomRef.current.localParticipant.setMicrophoneEnabled(false);
      setIsMicActive(false);
    } else {
      await roomRef.current.localParticipant.setMicrophoneEnabled(true);
      setIsMicActive(true);
    }
  }, [isReady, isMicActive]);

  const sendTextMessage = useCallback(async (text: string) => {
    if (!roomRef.current) return;
    await roomRef.current.localParticipant.sendText(text, { topic: 'lk.chat' });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected,
    isReady,
    isMicActive,
    isAgentSpeaking,
    currentTranscript,
    agentTranscript,
    userTranscript,
    userAudioLevel,
    agentAudioLevel,
    transcriptQueue,
    inputMode,
    deepMode,
    setDeepMode,
    connect,
    disconnect,
    startTalking,
    stopTalking,
    toggleMic,
    sendTextMessage,
  };
}
