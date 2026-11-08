import { create } from 'zustand';

type UiState = {
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleTheme: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  theme: typeof window !== 'undefined' && localStorage.getItem('enterprise-ai-theme') === 'light' ? 'light' : 'dark',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('enterprise-ai-theme', theme);
      return { theme };
    }),
}));
