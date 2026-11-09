import { create } from 'zustand';

export type User = {
  id: string;
  username: string;
  tenant: string;
  role: 'user' | 'admin';
  groups: string[];
};

type AuthState = {
  accessToken: string | null;
  user: User | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  setSession: (accessToken: string, user: User) => void;
  clearSession: () => void;
  setLoading: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'loading',
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  clearSession: () => set({ accessToken: null, user: null, status: 'anonymous' }),
  setLoading: () => set({ status: 'loading' }),
}));
