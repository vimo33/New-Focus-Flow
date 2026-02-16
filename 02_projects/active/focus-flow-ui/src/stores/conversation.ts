import { create } from 'zustand';
import { api } from '../services/api';

export interface ConversationCard {
  type: 'action';
  title: string;
  description?: string;
  accent: 'cyan' | 'amber' | 'violet';
  actions: Array<{ label: string; variant: 'primary' | 'secondary' }>;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'nitara';
  content: string;
  timestamp: string;
  source?: 'text' | 'voice';
  cards?: ConversationCard[];
}

interface ConversationStore {
  messages: ConversationMessage[];
  isExpanded: boolean;
  isRecording: boolean;
  isVoiceActive: boolean;
  currentTranscript: string;
  inputValue: string;
  threadId: string | null;
  projectId: string | null;
  projectName: string | null;
  setInputValue: (value: string) => void;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  setRecording: (recording: boolean) => void;
  setVoiceActive: (active: boolean) => void;
  setCurrentTranscript: (text: string) => void;
  setProjectContext: (projectId: string | null, projectName?: string | null) => void;
  sendMessage: (content: string) => void;
  addNitaraMessage: (content: string, cards?: ConversationCard[]) => void;
  addVoiceMessage: (role: 'user' | 'nitara', content: string) => void;
}

let messageId = 0;

export const useConversationStore = create<ConversationStore>((set, get) => ({
  messages: [],
  isExpanded: false,
  isRecording: false,
  isVoiceActive: false,
  currentTranscript: '',
  inputValue: '',
  threadId: null,
  projectId: null,
  projectName: null,
  setInputValue: (value) => set({ inputValue: value }),
  toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
  setExpanded: (expanded) => set({ isExpanded: expanded }),
  setRecording: (recording) => set({ isRecording: recording }),
  setVoiceActive: (active) => set({ isVoiceActive: active }),
  setCurrentTranscript: (text) => set({ currentTranscript: text }),
  setProjectContext: (projectId, projectName = null) => {
    // When switching project context, reset thread to start fresh project-scoped conversation
    set({ projectId, projectName, threadId: null });
  },
  sendMessage: (content) => {
    const userMsg: ConversationMessage = {
      id: `msg-${++messageId}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      source: 'text',
    };
    set((s) => ({
      messages: [...s.messages, userMsg],
      inputValue: '',
    }));

    // Call orchestrator chat API
    const { threadId, projectId } = get();
    api.sendOrchestratorMessage(content, threadId, 'text', projectId)
      .then((response) => {
        if (response.thread_id && !threadId) {
          set({ threadId: response.thread_id });
        }
        const nitaraMsg: ConversationMessage = {
          id: `msg-${++messageId}`,
          role: 'nitara',
          content: response.content || `I understand. Let me look into that for you.`,
          timestamp: new Date().toISOString(),
          source: 'text',
        };
        set((s) => ({ messages: [...s.messages, nitaraMsg] }));
      })
      .catch(() => {
        // Fallback if API call fails
        const nitaraMsg: ConversationMessage = {
          id: `msg-${++messageId}`,
          role: 'nitara',
          content: `I understand. Let me look into "${content}" for you.`,
          timestamp: new Date().toISOString(),
          source: 'text',
        };
        set((s) => ({ messages: [...s.messages, nitaraMsg] }));
      });
  },
  addNitaraMessage: (content, cards) => {
    const msg: ConversationMessage = {
      id: `msg-${++messageId}`,
      role: 'nitara',
      content,
      timestamp: new Date().toISOString(),
      cards,
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },
  addVoiceMessage: (role, content) => {
    const msg: ConversationMessage = {
      id: `msg-${++messageId}`,
      role: role === 'user' ? 'user' : 'nitara',
      content,
      timestamp: new Date().toISOString(),
      source: 'voice',
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },
}));
