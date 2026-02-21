import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
}

interface AuthStore {
  user: User | null;
  team: Team | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, team: Team, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  team: null,
  token: localStorage.getItem('nitara_token'),
  isAuthenticated: !!localStorage.getItem('nitara_token'),
  setAuth: (user, team, token) => {
    localStorage.setItem('nitara_token', token);
    set({ user, team, token, isAuthenticated: true });
  },
  clearAuth: () => {
    localStorage.removeItem('nitara_token');
    set({ user: null, team: null, token: null, isAuthenticated: false });
  },
}));
