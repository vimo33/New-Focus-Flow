import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ToolExecutionCard } from './ToolExecutionCard';
import { useSTT } from '../../hooks/useSTT';

interface OrchestratorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source: 'voice' | 'text';
  created_at: string;
  tool_calls?: Array<{
    tool: string;
    input: Record<string, any>;
    result: { success: boolean; data?: any; error?: string; navigate_to?: string };
  }>;
}

interface OrchestratorThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview?: string;
}

export function CommandCenter() {
  const { threadId: urlThreadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();

  const [threads, setThreads] = useState<OrchestratorThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(urlThreadId || null);
  const [messages, setMessages] = useState<OrchestratorMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { isListening, isTranscribing, startListening, stopListening } = useSTT({
    continuous: false,
    onResult: (text) => setInput(text),
    onInterim: (text) => setInput(text),
  });

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Load threads
  const loadThreads = useCallback(async () => {
    try {
      const res = await api.getOrchestratorThreads();
      setThreads(res.threads);
    } catch (e) {
      console.error('Failed to load threads:', e);
    }
  }, []);

  // Load thread messages
  const loadThread = useCallback(async (id: string) => {
    try {
      const res = await api.getOrchestratorThread(id);
      setMessages(res.messages || []);
      setActiveThreadId(id);
    } catch (e) {
      console.error('Failed to load thread:', e);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (urlThreadId) {
      loadThread(urlThreadId);
    }
  }, [urlThreadId, loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setInput('');
    setIsSending(true);

    // Optimistic user message
    const tempUserMsg: OrchestratorMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      source: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await api.sendOrchestratorMessage(text, activeThreadId, 'text');

      // Update thread ID if new
      if (!activeThreadId && res.thread_id) {
        setActiveThreadId(res.thread_id);
        navigate(`/command/${res.thread_id}`, { replace: true });
        loadThreads();
      }

      // Add assistant message
      const assistantMsg: OrchestratorMessage = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: res.content,
        source: 'text',
        created_at: new Date().toISOString(),
        tool_calls: res.tool_calls,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Handle navigation command
      if (res.navigate_to) {
        setTimeout(() => navigate(res.navigate_to!), 1000);
      }
    } catch (error: any) {
      const errorMsg: OrchestratorMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error.message}. Please try again.`,
        source: 'text',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewThread = () => {
    setActiveThreadId(null);
    setMessages([]);
    navigate('/command');
    inputRef.current?.focus();
  };

  const selectThread = (id: string) => {
    loadThread(id);
    navigate(`/command/${id}`);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] md:h-screen">
      {/* Thread Sidebar */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 fixed md:relative z-40 md:z-0
        w-72 h-full bg-surface-dark border-r border-card-dark
        transition-transform duration-200 flex flex-col
      `}>
        <div className="p-4 border-b border-card-dark">
          <button
            onClick={startNewThread}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {threads.map(thread => (
            <button
              key={thread.id}
              onClick={() => selectThread(thread.id)}
              className={`w-full text-left px-4 py-3 hover:bg-card-dark transition-colors ${
                activeThreadId === thread.id ? 'bg-card-dark border-l-2 border-primary' : ''
              }`}
            >
              <div className="text-sm font-medium text-white truncate">{thread.title}</div>
              {thread.last_message_preview && (
                <div className="text-xs text-gray-400 truncate mt-0.5">{thread.last_message_preview}</div>
              )}
            </button>
          ))}
          {threads.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No conversations yet. Start typing below.
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-card-dark bg-surface-dark">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="material-symbols-outlined text-primary text-[24px]">terminal</span>
          <h1 className="text-lg font-semibold text-white">Command Center</h1>
          <div className="flex-1" />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Orchestrator Active
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">terminal</span>
              <h2 className="text-xl font-semibold text-gray-300 mb-2">Nitara Command Center</h2>
              <p className="text-gray-500 max-w-md mb-6">
                Your AI orchestrator with full control over tasks, projects, ideas, and more.
                Type or speak naturally.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  'Create a task: Review Q2 goals',
                  'What\'s in my inbox?',
                  'Show my projects',
                  'Log mood: 8',
                  'I have an idea for a meal planning app',
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    className="px-3 py-1.5 bg-card-dark text-gray-300 rounded-full text-xs hover:bg-primary/20 hover:text-primary transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.role === 'user' ? '' : 'w-full max-w-2xl'}`}>
                {/* Tool execution cards */}
                {msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {msg.tool_calls.map((tc, i) => (
                      <ToolExecutionCard key={i} toolCall={tc} />
                    ))}
                  </div>
                )}
                {/* Message bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-card-dark text-gray-200 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/~~(.*?)~~/g, '<del>$1</del>')
                        .replace(/\n/g, '<br/>')
                    }} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-card-dark px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-card-dark bg-surface-dark px-4 py-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <button
              onClick={toggleListening}
              disabled={isTranscribing}
              className={`flex-shrink-0 p-2.5 rounded-full transition-all ${
                isTranscribing
                  ? 'bg-amber-500 text-white animate-pulse'
                  : isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-card-dark text-gray-400 hover:text-white hover:bg-gray-600'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isTranscribing ? 'hourglass_top' : isListening ? 'mic' : 'mic_none'}
              </span>
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or ask anything..."
              rows={1}
              className="flex-1 bg-card-dark text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
              style={{ minHeight: '40px' }}
            />

            <button
              onClick={sendMessage}
              disabled={!input.trim() || isSending}
              className="flex-shrink-0 p-2.5 bg-primary hover:bg-primary-dark disabled:opacity-30 disabled:hover:bg-primary text-white rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
