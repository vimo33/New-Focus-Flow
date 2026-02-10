import { useState, useEffect, useRef, useCallback } from 'react';
import { useThreadsStore } from '../../stores/threads';
import { useTTS } from '../../hooks/useTTS';

interface ChatPanelProps {
  onToggleSidebar: () => void;
  ttsEnabled: boolean;
}

export function ChatPanel({ onToggleSidebar, ttsEnabled }: ChatPanelProps) {
  const {
    activeThreadId,
    messages,
    isSending,
    error,
    sendMessage,
    createThread,
  } = useThreadsStore();

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const { speak, stop: stopTTS, isSpeaking } = useTTS();

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();

      if (recognitionRef.current) {
        recognitionRef.current.continuous = handsFreeMode;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setLocalError(null);
        };

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += piece;
            } else {
              interimTranscript += piece;
            }
          }

          if (finalTranscript) {
            setTranscript('');
            handleSend(finalTranscript.trim(), 'voice');
          } else {
            setTranscript(interimTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            setLocalError('Voice recognition error. Please try again.');
          }
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          if (handsFreeMode && recognitionRef.current) {
            setTimeout(() => {
              try {
                recognitionRef.current?.start();
              } catch (_) {}
            }, 100);
          }
        };
      }
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [handsFreeMode]);

  // Handle hands-free mode toggle
  useEffect(() => {
    if (handsFreeMode && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (_) {}
    } else if (!handsFreeMode && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [handsFreeMode]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      setLocalError('Voice recognition is not supported in your browser');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setLocalError(null);
      try {
        recognitionRef.current.start();
      } catch (_) {
        setLocalError('Failed to start voice recognition');
      }
    }
  }, [isListening]);

  const handleSend = useCallback(
    async (text: string, source: 'voice' | 'text' = 'text') => {
      if (!text.trim() || isSending) return;

      // Auto-create thread if none active
      let threadId = activeThreadId;
      if (!threadId) {
        const thread = await createThread();
        threadId = thread.id;
      }

      const assistantMsg = await sendMessage(text.trim(), source);

      // TTS for assistant response
      if (assistantMsg && ttsEnabled) {
        speak(assistantMsg.content);
      }
    },
    [activeThreadId, isSending, createThread, sendMessage, ttsEnabled, speak]
  );

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    const text = inputText;
    setInputText('');
    await handleSend(text, 'text');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${formatTime(timestamp)}`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const shouldShowTimestamp = (index: number) => {
    if (index === 0) return true;
    const current = new Date(messages[index].created_at);
    const previous = new Date(messages[index - 1].created_at);
    return (current.getTime() - previous.getTime()) / 1000 / 60 > 5;
  };

  const displayError = error || localError;

  return (
    <section className="flex-1 flex flex-col h-full min-w-0 bg-[#111a22]/50 relative">
      {/* Fade overlay at top */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#111a22] to-transparent z-10 pointer-events-none" />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 pt-10 pb-4">
        {/* Sidebar toggle for mobile */}
        <div className="lg:hidden flex items-center mb-2">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>

        {!activeThreadId && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md px-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-primary text-[32px]">
                  forum
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white">
                Start a Conversation
              </h3>
              <p className="text-slate-400 text-sm">
                Type a message below or use the microphone to start talking.
                A new thread will be created automatically.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={message.id}>
              {shouldShowTimestamp(index) && (
                <div className="flex justify-center mb-4">
                  <span className="text-xs text-slate-500 font-medium bg-[#1e2936] px-3 py-1 rounded-full">
                    {formatDate(message.created_at)}
                  </span>
                </div>
              )}

              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-primary text-white rounded-2xl rounded-tr-sm p-4 shadow-lg shadow-blue-900/10">
                    <p className="text-base leading-relaxed">{message.content}</p>
                    {message.source === 'voice' && (
                      <span className="material-symbols-outlined text-white/50 text-[12px] mt-1 block text-right">
                        mic
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex justify-start items-end gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center shrink-0 shadow-lg">
                    <span className="material-symbols-outlined text-white text-sm">
                      smart_toy
                    </span>
                  </div>
                  <div className="max-w-[85%] bg-[#1e2936] border border-slate-700 text-slate-200 rounded-2xl rounded-tl-sm p-4">
                    <p className="text-base leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isSending && (
          <div className="flex justify-start items-end gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center shrink-0 shadow-lg">
              <span className="material-symbols-outlined text-white text-sm">
                smart_toy
              </span>
            </div>
            <div className="bg-[#1e2936] border border-slate-700 text-slate-200 rounded-2xl rounded-tl-sm p-4">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice HUD strip */}
      <div className="px-4 py-2 border-t border-slate-800/50 flex items-center justify-center gap-4 bg-[#0d1520]/80">
        {/* Waveform mini */}
        <div className="flex items-center gap-0.5 h-6">
          {isListening ? (
            <>
              {[8, 12, 20, 24, 20, 12, 8].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-accent-teal waveform-bar"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${-i * 0.1}s`,
                  }}
                />
              ))}
            </>
          ) : (
            <>
              {[4, 6, 8, 10, 8, 6, 4].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-slate-700/50"
                  style={{ height: `${h}px` }}
                />
              ))}
            </>
          )}
        </div>

        {/* Mic button */}
        <button
          onClick={toggleListening}
          disabled={handsFreeMode}
          className={`
            relative h-10 w-10 rounded-full flex items-center justify-center transition-all
            ${isListening ? 'bg-primary/20 border border-primary' : 'bg-[#1e2936] border border-slate-700 hover:border-primary'}
            ${handsFreeMode ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isListening && (
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          )}
          <span
            className={`material-symbols-outlined ${isListening ? 'text-primary' : 'text-slate-400'} relative z-10`}
            style={{ fontSize: '20px', fontVariationSettings: '"FILL" 1' }}
          >
            mic
          </span>
        </button>

        {/* Hands-free toggle */}
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-500" style={{ fontSize: '16px' }}>
            headset_mic
          </span>
          <label className="relative flex h-[20px] w-[36px] cursor-pointer items-center rounded-full bg-[#233648] p-0.5 has-[:checked]:justify-end has-[:checked]:bg-primary transition-colors duration-200">
            <div className="h-[16px] w-[16px] rounded-full bg-white shadow-sm" />
            <input
              type="checkbox"
              checked={handsFreeMode}
              onChange={(e) => setHandsFreeMode(e.target.checked)}
              className="invisible absolute"
            />
          </label>
        </div>

        {/* TTS speaking indicator */}
        {isSpeaking && (
          <button
            onClick={stopTTS}
            className="flex items-center gap-1 text-xs text-accent-teal hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] animate-pulse">
              volume_up
            </span>
            <span>Stop</span>
          </button>
        )}

        {/* Live transcript */}
        {transcript && (
          <span className="text-accent-teal text-xs italic truncate max-w-[200px]">
            {transcript}
          </span>
        )}
      </div>

      {/* Text input */}
      <div className="p-3 border-t border-slate-800 bg-[#111a22]">
        <form onSubmit={handleTextSubmit} className="relative">
          <input
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full bg-[#1e2936] border-none rounded-xl py-3 pl-4 pr-12 text-white placeholder-slate-500 focus:ring-1 focus:ring-primary"
            placeholder={
              activeThreadId
                ? 'Type a message...'
                : 'Type a message to start a new thread...'
            }
            type="text"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>

      {/* Error toast */}
      {displayError && (
        <div className="absolute bottom-20 left-4 right-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm shadow-xl z-50 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <p className="flex-1">{displayError}</p>
            <button
              onClick={() => {
                setLocalError(null);
                useThreadsStore.setState({ error: null });
              }}
              className="text-red-300 hover:text-red-100"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Waveform animation CSS */}
      <style>{`
        @keyframes pulse-height {
          0%, 100% { height: 20%; opacity: 0.5; }
          50% { height: 80%; opacity: 1; }
        }
        .waveform-bar {
          animation: pulse-height 1.2s ease-in-out infinite;
        }
        .waveform-bar:nth-child(odd) { animation-duration: 0.8s; }
        .waveform-bar:nth-child(2n) { animation-duration: 1.1s; }
        .waveform-bar:nth-child(3n) { animation-duration: 1.3s; }
        .waveform-bar:nth-child(4n) { animation-duration: 0.9s; }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </section>
  );
}
