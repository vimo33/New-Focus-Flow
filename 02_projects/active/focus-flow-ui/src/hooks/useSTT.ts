import { useState, useEffect, useRef, useCallback } from 'react';
import { voiceBridge } from '../services/voice-bridge';

export type STTProvider = 'whisper' | 'browser' | 'none';

interface UseSTTOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onResult?: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseSTTReturn {
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  provider: STTProvider;
  isAvailable: boolean;
}

export function useSTT(options: UseSTTOptions = {}): UseSTTReturn {
  const {
    continuous = false,
    interimResults = true,
    lang = 'en-US',
    onResult,
    onInterim,
    onError,
  } = options;

  const [provider, setProvider] = useState<STTProvider>('none');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Stable refs for callbacks so we don't re-init on every render
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onInterimRef.current = onInterim;
  onErrorRef.current = onError;

  const continuousRef = useRef(continuous);
  continuousRef.current = continuous;

  // Browser SpeechRecognition
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Whisper recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Detect provider on mount
  useEffect(() => {
    let cancelled = false;

    // Init browser immediately as baseline
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setProvider('browser');
    }

    // Try to upgrade to whisper
    voiceBridge.checkHealth().then((health) => {
      if (cancelled) return;
      if (health?.stt) {
        setProvider('whisper');
        console.log('[useSTT] Upgraded to whisper provider');
      } else {
        console.log('[useSTT] Bridge unavailable, using browser provider');
      }
    });

    return () => { cancelled = true; };
  }, []);

  // Init browser SpeechRecognition when provider is 'browser'
  useEffect(() => {
    if (provider !== 'browser') {
      recognitionRef.current = null;
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += piece;
        } else {
          interim += piece;
        }
      }

      if (final) {
        setTranscript('');
        onResultRef.current?.(final.trim());
      } else if (interim) {
        setTranscript(interim);
        onInterimRef.current?.(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[useSTT] Browser recognition error:', event.error);
      setIsListening(false);
      onErrorRef.current?.(event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (continuousRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch (_) { /* already started */ }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch (_) { /* not started */ }
    };
  }, [provider, continuous, interimResults, lang]);

  // Whisper: start recording via MediaRecorder
  const startWhisper = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Release mic
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];

        if (blob.size === 0) return;

        setIsTranscribing(true);
        try {
          const text = await voiceBridge.transcribe(blob);
          if (text) {
            onResultRef.current?.(text.trim());
          }
        } catch (err: any) {
          console.error('[useSTT] Whisper transcription error:', err);
          onErrorRef.current?.(err.message || 'Transcription failed');
        } finally {
          setIsTranscribing(false);

          // Continuous mode: auto-restart recording
          if (continuousRef.current) {
            startWhisper();
          }
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch (err: any) {
      console.error('[useSTT] Failed to start whisper recording:', err);
      onErrorRef.current?.(err.message || 'Microphone access denied');
    }
  }, []);

  const stopWhisper = useCallback(() => {
    continuousRef.current = false; // Break auto-restart loop
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    // Restore continuous ref on next render via the prop
    requestAnimationFrame(() => {
      continuousRef.current = continuous;
    });
  }, [continuous]);

  const startListening = useCallback(() => {
    setTranscript('');
    if (provider === 'whisper') {
      startWhisper();
    } else if (provider === 'browser' && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (_) { /* already started */ }
    }
  }, [provider, startWhisper]);

  const stopListening = useCallback(() => {
    if (provider === 'whisper') {
      stopWhisper();
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) { /* not started */ }
      setIsListening(false);
    }
  }, [provider, stopWhisper]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try { recognitionRef.current?.stop(); } catch (_) { /* */ }
    };
  }, []);

  return {
    startListening,
    stopListening,
    isListening,
    isTranscribing,
    transcript,
    provider,
    isAvailable: provider !== 'none',
  };
}
