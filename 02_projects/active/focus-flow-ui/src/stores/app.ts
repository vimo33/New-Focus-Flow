import { create } from 'zustand';

export interface InboxCount {
  work: number;
  personal: number;
  ideas: number;
}

export interface AppState {
  // State
  theme: 'light' | 'dark';
  isOffline: boolean;
  inboxCount: InboxCount;

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setOffline: (offline: boolean) => void;
  refreshInboxCount: () => Promise<void>;
}

// API Base URL - adjust based on environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
  isOffline: false,
  inboxCount: {
    work: 0,
    personal: 0,
    ideas: 0
  },

  // Actions
  setTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem('theme', theme);
    set({ theme });

    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    get().setTheme(newTheme);
  },

  setOffline: (offline: boolean) => {
    set({ isOffline: offline });
  },

  refreshInboxCount: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/inbox/counts`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Ensure the data has the expected structure
      const inboxCount: InboxCount = {
        work: data.work ?? 0,
        personal: data.personal ?? 0,
        ideas: data.ideas ?? 0
      };

      set({ inboxCount });
      set({ isOffline: false });
    } catch (error) {
      console.error('Failed to refresh inbox count:', error);
      set({ isOffline: true });
    }
  }
}));
