import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

type PreferencesState = {
  theme: Theme;
  sidebarOpen: boolean;
  setTheme: (theme: Theme) => void;
  setSidebarOpen: (open: boolean) => void;
};

export const PREFERENCES_STORAGE_KEY = 'outlethub:preferences';

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: true,
      setTheme: (theme) => set({ theme }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, sidebarOpen }) => ({ theme, sidebarOpen }),
    },
  ),
);
