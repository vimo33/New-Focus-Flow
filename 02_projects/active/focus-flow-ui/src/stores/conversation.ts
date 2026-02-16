import { create } from 'zustand';

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
  cards?: ConversationCard[];
}

interface ConversationStore {
  messages: ConversationMessage[];
  isExpanded: boolean;
  isRecording: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  setRecording: (recording: boolean) => void;
  sendMessage: (content: string) => void;
  addNitaraMessage: (content: string, cards?: ConversationCard[]) => void;
}

let messageId = 0;

export const useConversationStore = create<ConversationStore>((set, _get) => ({
  messages: [
    {
      id: 'welcome',
      role: 'nitara',
      content: 'Good morning. I\'ve reviewed your portfolio overnight. You have 3 priorities today and 2 approvals pending. What would you like to focus on?',
      timestamp: new Date().toISOString(),
    },
  ],
  isExpanded: false,
  isRecording: false,
  inputValue: '',
  setInputValue: (value) => set({ inputValue: value }),
  toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
  setExpanded: (expanded) => set({ isExpanded: expanded }),
  setRecording: (recording) => set({ isRecording: recording }),
  sendMessage: (content) => {
    const userMsg: ConversationMessage = {
      id: `msg-${++messageId}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      messages: [...s.messages, userMsg],
      inputValue: '',
    }));

    // Simulate Nitara response (will be replaced with real API call)
    setTimeout(() => {
      const nitaraMsg: ConversationMessage = {
        id: `msg-${++messageId}`,
        role: 'nitara',
        content: `I understand. Let me look into "${content}" for you.`,
        timestamp: new Date().toISOString(),
      };
      set((s) => ({ messages: [...s.messages, nitaraMsg] }));
    }, 1000);
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
}));
