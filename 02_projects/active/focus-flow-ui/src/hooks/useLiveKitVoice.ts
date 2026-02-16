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
  connect: (threadId?: string, projectId?: string) => Promise<void>;
  disconnect: () => void;
  startTalking: () => void;
  stopTalking: () => void;
  toggleMic: () => void;
}

function getInputMode(): InputMode {
  const stored = localStorage.getItem('nitara-input-mode');
  if (stored === 'voice-active' || stored === 'toggle' || stored === 'push-to-talk') return stored;
  return 'toggle'; // default to toggle — much better UX than push-to-hold
}

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

  const roomRef = useRef<Room | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      tokenParams.deepMode = true; // Auto deep mode for project voice
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

    // Transcription from LiveKit Agents SDK (primary method)
    room.on(RoomEvent.TranscriptionReceived, (
      segments: TranscriptionSegment[],
      participant?: Participant
    ) => {
      const text = segments.map(s => s.text).join(' ').trim();
      if (!text) return;

      const isAgent = participant?.identity !== room.localParticipant.identity;
      const isFinal = segments.some(s => s.final);

      setCurrentTranscript(text);

      if (isAgent) {
        setAgentTranscript(text);
      } else {
        setUserTranscript(text);
      }

      // When a final transcript arrives, queue it for the conversation thread
      if (isFinal && text.length > 1) {
        setTranscriptQueue(q => [...q, { role: isAgent ? 'nitara' : 'user', text }]);
      }
    });

    // Data messages fallback (for custom data payloads)
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

    // Request mic permission by enabling then disabling, but with proper timing.
    // This pre-creates the audio track so subsequent enable calls are instant.
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      // Wait for WebRTC negotiation to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // For voice-active mode, keep mic on
      if (getInputMode() === 'voice-active') {
        setIsMicActive(true);
      } else {
        await room.localParticipant.setMicrophoneEnabled(false);
      }
    } catch (err) {
      console.warn('[Voice] Mic permission failed:', err);
    }

    // Mark as ready after a brief stabilization delay
    setTimeout(() => setIsReady(true), 300);

    // Poll audio levels
    levelIntervalRef.current = setInterval(() => {
      if (!roomRef.current) return;
      const local = roomRef.current.localParticipant;
      setUserAudioLevel(local.audioLevel || 0);

      const remoteParticipants = Array.from(roomRef.current.remoteParticipants.values());
      const maxRemoteLevel = remoteParticipants.reduce(
        (max, p) => Math.max(max, p.audioLevel || 0),
        0
      );
      setAgentAudioLevel(maxRemoteLevel);
    }, 100);
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

  // Toggle mic on/off (for toggle mode)
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
    connect,
    disconnect,
    startTalking,
    stopTalking,
    toggleMic,
  };
}
