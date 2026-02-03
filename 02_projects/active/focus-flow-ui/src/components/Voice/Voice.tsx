import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';

interface VoiceProps {
  className?: string;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface SuggestedAction {
  id: string;
  type: 'reschedule' | 'focus_block' | 'task' | 'event';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  status: 'pending' | 'approved' | 'rejected';
  metadata?: Record<string, any>;
}

export function Voice({ className = '' }: VoiceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [handsFreeMode, setHandsFreeMode] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [connectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const [latency] = useState(12);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          setError(null);
        };

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPiece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPiece;
            } else {
              interimTranscript += transcriptPiece;
            }
          }

          if (finalTranscript) {
            setTranscript('');
            handleVoiceCommand(finalTranscript);
          } else {
            setTranscript(interimTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error !== 'no-speech') {
            setError('Voice recognition error. Please try again.');
          }
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          // Restart if hands-free mode is enabled
          if (handsFreeMode && recognitionRef.current) {
            setTimeout(() => {
              try {
                recognitionRef.current?.start();
              } catch (e) {
                // Ignore if already started
              }
            }, 100);
          }
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [handsFreeMode]);

  // Start/stop listening when hands-free mode changes
  useEffect(() => {
    if (handsFreeMode && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started
      }
    } else if (!handsFreeMode && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [handsFreeMode]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Voice recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        setError('Failed to start voice recognition');
      }
    }
  };

  const handleVoiceCommand = async (text: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Process command and get AI response
      const response = await processAICommand(text);

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        text: response.message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update suggested actions if any
      if (response.actions && response.actions.length > 0) {
        setSuggestedActions((prev) => [...response.actions, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process command');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    await handleVoiceCommand(inputText);
    setInputText('');
  };

  const processAICommand = async (text: string): Promise<{ message: string; actions: SuggestedAction[] }> => {
    // Parse command and determine intent
    const lowerText = text.toLowerCase();

    // Command: "capture [text]" or "create task [text]"
    if (lowerText.startsWith('capture ') || lowerText.startsWith('create task ')) {
      const taskText = text.replace(/^(capture|create task)\s+/i, '');
      await api.capture({ text: taskText, source: 'voice' });
      return {
        message: `I've captured "${taskText}" to your inbox. You can process it later or I can help you categorize it now.`,
        actions: [],
      };
    }

    // Command: "show my tasks"
    if (lowerText.includes('show') && lowerText.includes('task')) {
      const tasksResponse = await api.getTasks();
      const taskCount = tasksResponse.count;
      return {
        message: `You have ${taskCount} active tasks. Would you like me to list them or help you prioritize?`,
        actions: [],
      };
    }

    // Command: "create project [name]"
    if (lowerText.startsWith('create project ')) {
      const projectName = text.replace(/^create project\s+/i, '');
      await api.createProject({ title: projectName, status: 'active' });
      return {
        message: `I've created a new project called "${projectName}". Would you like to add some initial tasks?`,
        actions: [],
      };
    }

    // Default: Schedule-related or general query
    // Simulate AI response for scheduling conflicts
    if (lowerText.includes('overwhelmed') || lowerText.includes('schedule') || lowerText.includes('restructure')) {
      const actions: SuggestedAction[] = [
        {
          id: `action-${Date.now()}-1`,
          type: 'reschedule',
          title: 'Reschedule Meeting',
          subtitle: 'Conflict with Deep Work',
          description: 'Move Product Sync to Tomorrow, 10:00 AM?',
          icon: 'event_busy',
          iconColor: 'text-orange-500',
          iconBg: 'bg-orange-500/10',
          status: 'pending',
        },
        {
          id: `action-${Date.now()}-2`,
          type: 'focus_block',
          title: 'Focus Block',
          subtitle: 'Productivity Optimization',
          description: 'Schedule Deep Work for Today, 3 PM - 5 PM?',
          icon: 'timer',
          iconColor: 'text-emerald-500',
          iconBg: 'bg-emerald-500/10',
          status: 'pending',
        },
      ];

      return {
        message: "I understand. Let's create some breathing room. I can move your 2 PM sync to tomorrow and block out 3 PM to 5 PM for deep work.",
        actions,
      };
    }

    // Generic response
    return {
      message: "I'm here to help! You can ask me to capture tasks, show your schedule, create projects, or manage your day. What would you like to do?",
      actions: [],
    };
  };

  const handleActionApprove = async (actionId: string) => {
    setSuggestedActions((prev) =>
      prev.map((action) =>
        action.id === actionId ? { ...action, status: 'approved' as const } : action
      )
    );

    // Add confirmation message
    const action = suggestedActions.find((a) => a.id === actionId);
    if (action) {
      const confirmationMessage: Message = {
        id: `system-${Date.now()}`,
        type: 'assistant',
        text: `Great! I've ${action.type === 'reschedule' ? 'rescheduled the meeting' : 'scheduled your deep work block'}. You're all set!`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, confirmationMessage]);
    }
  };

  const handleActionReject = async (actionId: string) => {
    setSuggestedActions((prev) =>
      prev.map((action) =>
        action.id === actionId ? { ...action, status: 'rejected' as const } : action
      )
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return `Today, ${formatTime(timestamp)}`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Show timestamp for first message or when messages are > 5 min apart
  const shouldShowTimestamp = (index: number) => {
    if (index === 0) return true;
    const current = new Date(messages[index].timestamp);
    const previous = new Date(messages[index - 1].timestamp);
    const diffMinutes = (current.getTime() - previous.getTime()) / 1000 / 60;
    return diffMinutes > 5;
  };

  const pendingActions = suggestedActions.filter((a) => a.status === 'pending');
  const completedActions = suggestedActions.filter((a) => a.status !== 'pending');

  return (
    <div className={`h-screen flex flex-col ${className}`} data-testid="voice-cockpit">
      {/* Header */}
      <header className="h-20 flex items-center justify-between px-6 border-b border-slate-800 bg-[#111a22]/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-white tracking-tight text-2xl font-bold leading-tight">
            Voice Cockpit
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-teal shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
            <p className="text-[#92adc9] text-sm font-normal">Focus Mode Active</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-8 items-center justify-center gap-x-2 rounded-full bg-[#1e2936] border border-slate-700 px-4 py-1">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <p className="text-slate-300 text-xs font-medium tracking-wide">
              {connectionStatus === 'connected' ? `LIVE • ${latency}ms WebSocket` : 'DISCONNECTED'}
            </p>
          </div>
        </div>
      </header>

      {/* Content Columns */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT: Transcript Column */}
        <section className="flex-1 lg:flex-[1.2] flex flex-col border-r border-slate-800 h-full min-w-[320px] bg-[#111a22]/50 relative">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background-dark to-transparent z-10 pointer-events-none" />

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 pt-12 pb-24" data-testid="messages-container">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-primary text-[32px]">mic</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Start a Conversation</h3>
                  <p className="text-slate-400 text-sm">
                    Try saying "Create a task for tomorrow" or "Show my schedule"
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={message.id}>
                  {shouldShowTimestamp(index) && (
                    <div className="flex justify-center mb-6">
                      <span className="text-xs text-slate-500 font-medium bg-[#1e2936] px-3 py-1 rounded-full">
                        {formatDate(message.timestamp)}
                      </span>
                    </div>
                  )}

                  {message.type === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-primary text-white rounded-2xl rounded-tr-sm p-4 shadow-lg shadow-blue-900/10">
                        <p className="text-base font-normal leading-relaxed">{message.text}</p>
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
                        <p className="text-base font-normal leading-relaxed">{message.text}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {isProcessing && (
              <div className="flex justify-start items-end gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center shrink-0 shadow-lg">
                  <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                </div>
                <div className="bg-[#1e2936] border border-slate-700 text-slate-200 rounded-2xl rounded-tl-sm p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-800 bg-[#111a22]">
            <form onSubmit={handleTextSubmit} className="relative">
              <input
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-[#1e2936] border-none rounded-xl py-3 pl-4 pr-12 text-white placeholder-slate-500 focus:ring-1 focus:ring-primary"
                placeholder="Type a message or just speak..."
                type="text"
                data-testid="voice-input"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                data-testid="send-button"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </div>
        </section>

        {/* CENTER: HUD / Visualizer */}
        <section className="flex-1 lg:flex-[1.5] flex flex-col items-center justify-center relative p-6 bg-gradient-to-b from-[#101922] to-[#0b1117]">
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          </div>

          {/* Main Status Display */}
          <div className="flex flex-col items-center gap-12 z-10 w-full max-w-md">
            {/* Waveform Visualizer */}
            <div
              aria-label="Audio waveform visualization"
              className="h-32 w-full flex items-center justify-center gap-1.5 md:gap-2 px-8"
              data-testid="waveform-visualizer"
            >
              {isListening ? (
                <>
                  <div className="w-1.5 md:w-2 rounded-full bg-accent-teal/30 h-8" />
                  <div className="w-1.5 md:w-2 rounded-full bg-accent-teal/50 h-12 waveform-bar" />
                  <div className="w-1.5 md:w-2 rounded-full bg-accent-teal/80 h-20 waveform-bar" />
                  <div className="w-1.5 md:w-2 rounded-full bg-accent-teal h-24 waveform-bar" style={{ animationDelay: '-0.2s' }} />
                  <div className="w-1.5 md:w-2 rounded-full bg-accent-teal h-32 waveform-bar" style={{ animationDelay: '-0.5s' }} />
                  <div className="w-1.5 md:w-2 rounded-full bg-accent-teal h-28 waveform-bar" style={{ animationDelay: '-0.1s' }} />
                  <div className="w-1.5 md:w-2 rounded-full bg-accent-teal/80 h-16 waveform-bar" />
                  <div className="w-1.5 md:w-2 rounded-full bg-accent-teal/50 h-10 waveform-bar" />
                  <div className="w-1.5 md:w-2 rounded-full bg-accent-teal/30 h-6" />
                </>
              ) : (
                <>
                  <div className="w-1.5 md:w-2 rounded-full bg-slate-700/50 h-4" />
                  <div className="w-1.5 md:w-2 rounded-full bg-slate-700/50 h-6" />
                  <div className="w-1.5 md:w-2 rounded-full bg-slate-700/50 h-8" />
                  <div className="w-1.5 md:w-2 rounded-full bg-slate-700/50 h-10" />
                  <div className="w-1.5 md:w-2 rounded-full bg-slate-700/50 h-12" />
                  <div className="w-1.5 md:w-2 rounded-full bg-slate-700/50 h-10" />
                  <div className="w-1.5 md:w-2 rounded-full bg-slate-700/50 h-8" />
                  <div className="w-1.5 md:w-2 rounded-full bg-slate-700/50 h-6" />
                  <div className="w-1.5 md:w-2 rounded-full bg-slate-700/50 h-4" />
                </>
              )}
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-2xl font-semibold text-white tracking-wide">
                {isListening ? 'Listening...' : 'Ready'}
              </h3>
              {transcript && (
                <p className="text-accent-teal text-sm italic">{transcript}</p>
              )}
              {!isListening && (
                <p className="text-slate-400 text-sm">
                  {handsFreeMode
                    ? 'Hands-free mode active'
                    : 'Click microphone to start'}
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mt-4">
              {/* Mic Button */}
              <button
                onClick={toggleListening}
                disabled={handsFreeMode}
                className="relative group"
                data-testid="mic-button"
              >
                <div className={`absolute inset-0 ${isListening ? 'bg-primary/30' : 'bg-primary/10'} rounded-full blur-md group-hover:bg-primary/50 transition-all duration-500 ${isListening ? 'animate-pulse' : ''}`} />
                <div className={`relative h-20 w-20 rounded-full bg-[#1e2936] border ${isListening ? 'border-primary' : 'border-primary/50'} text-white flex items-center justify-center shadow-2xl transition-transform active:scale-95 group-hover:border-primary ${handsFreeMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <span
                    className={`material-symbols-outlined ${isListening ? 'text-primary' : 'text-primary group-hover:text-white'} transition-colors`}
                    style={{ fontSize: '36px', fontVariationSettings: '"FILL" 1' }}
                  >
                    mic
                  </span>
                </div>
              </button>
            </div>

            {/* Hands-free Toggle */}
            <div className="flex items-center gap-4 bg-[#1e2936] p-2 pl-4 pr-3 rounded-full border border-slate-700 shadow-xl">
              <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '20px' }}>
                headset_mic
              </span>
              <div className="flex flex-col mr-2">
                <span className="text-xs font-semibold text-slate-200">Hands-Free</span>
              </div>
              <label
                className="relative flex h-[24px] w-[44px] cursor-pointer items-center rounded-full border-none bg-[#233648] p-0.5 has-[:checked]:justify-end has-[:checked]:bg-primary transition-colors duration-200"
                data-testid="hands-free-toggle"
              >
                <div className="h-[20px] w-[20px] rounded-full bg-white shadow-sm" />
                <input
                  type="checkbox"
                  checked={handsFreeMode}
                  onChange={(e) => setHandsFreeMode(e.target.checked)}
                  className="invisible absolute"
                />
              </label>
            </div>
          </div>
        </section>

        {/* RIGHT: Action Panel Column */}
        <section className="flex-1 lg:flex-[1] border-l border-slate-800 bg-[#111a22]/50 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-medium text-lg">Suggested Actions</h3>
            {pendingActions.length > 0 && (
              <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded">
                {pendingActions.length} NEW
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4" data-testid="suggested-actions">
            {pendingActions.length === 0 && completedActions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-slate-500">check_circle</span>
                </div>
                <p className="text-slate-400 text-sm">No pending actions</p>
                <p className="text-slate-500 text-xs mt-1">
                  I'll suggest actions as we talk
                </p>
              </div>
            ) : (
              <>
                {pendingActions.map((action) => (
                  <div
                    key={action.id}
                    className="group relative flex flex-col gap-4 rounded-xl border border-slate-700 bg-[#1e2936] p-5 hover:border-slate-600 transition-colors shadow-sm"
                    data-testid={`action-${action.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${action.iconBg} ${action.iconColor}`}>
                          <span className="material-symbols-outlined">{action.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-white text-sm font-semibold leading-tight">
                            {action.title}
                          </p>
                          <p className="text-slate-400 text-xs mt-1">{action.subtitle}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-background-dark rounded-lg p-3 border border-slate-800">
                      <p className="text-slate-300 text-sm">{action.description}</p>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => handleActionReject(action.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#2d3b4e] hover:bg-[#38485e] text-slate-200 text-sm font-medium py-2.5 rounded-lg transition-colors"
                        data-testid={`reject-${action.id}`}
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                        Reject
                      </button>
                      <button
                        onClick={() => handleActionApprove(action.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                        data-testid={`approve-${action.id}`}
                      >
                        <span className="material-symbols-outlined text-lg">check</span>
                        Approve
                      </button>
                    </div>
                  </div>
                ))}

                {completedActions.map((action) => (
                  <div key={action.id} className="opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-4 py-3 px-4 border-b border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-400 text-sm">
                          {action.status === 'approved' ? 'check' : 'close'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-300 text-sm line-through decoration-slate-500">
                          {action.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          {action.status === 'approved' ? 'Approved' : 'Rejected'} • Just now
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300 text-sm shadow-xl max-w-md z-50 animate-fade-in" data-testid="error-toast">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-300 hover:text-red-100"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* CSS for waveform animation */}
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
    </div>
  );
}
