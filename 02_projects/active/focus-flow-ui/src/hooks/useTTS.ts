import { useState, useCallback, useRef, useEffect } from 'react';
import { voiceBridge } from '../services/voice-bridge';

export type TTSProvider = 'piper' | 'browser';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [provider, setProvider] = useState<TTSProvider>('browser');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Check if Piper is available on mount
  useEffect(() => {
    voiceBridge.checkHealth().then((health) => {
      if (health?.tts) {
        setProvider('piper');
        console.log('[useTTS] Upgraded to piper provider');
      } else {
        console.log('[useTTS] Bridge unavailable, using browser provider');
      }
    });
  }, []);

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const speakBrowser = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('natural')
    ) || voices.find((v) => v.lang.startsWith('en-') && !v.localService)
      || voices.find((v) => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const speakPiper = useCallback(async (text: string) => {
    try {
      cleanupObjectUrl();
      const wavBlob = await voiceBridge.synthesize(text);
      const url = URL.createObjectURL(wavBlob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        cleanupObjectUrl();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        cleanupObjectUrl();
        // Fall back to browser for this utterance
        console.warn('[useTTS] Piper playback failed, falling back to browser');
        speakBrowser(text);
      };

      await audio.play();
    } catch (err) {
      console.warn('[useTTS] Piper synthesis failed, falling back to browser:', err);
      speakBrowser(text);
    }
  }, [cleanupObjectUrl, speakBrowser]);

  const speak = useCallback((text: string) => {
    if (provider === 'piper') {
      speakPiper(text);
    } else {
      speakBrowser(text);
    }
  }, [provider, speakPiper, speakBrowser]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      cleanupObjectUrl();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [cleanupObjectUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, isSpeaking, provider };
}
