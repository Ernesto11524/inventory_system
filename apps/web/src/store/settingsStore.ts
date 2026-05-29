import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AppSettings {
  storeName: string;
  storeTagline: string;
  storeLogo?: string | null;
  storeEmail?: string | null;
  storePhone?: string | null;
  storeAddress?: string | null;
  currency: string;
  currencySymbol: string;
  paystackPublicKey?: string | null;
  hasSecretKey?: boolean;
}

interface SettingsState {
  settings: AppSettings;
  theme: 'light' | 'dark';
  setSettings: (s: Partial<AppSettings>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const defaults: AppSettings = {
  storeName: 'StockFlow',
  storeTagline: 'Inventory System',
  currency: 'GHS',
  currencySymbol: 'GH₵',
};

function applyTheme(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaults,
      theme: 'light',

      setSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(next);
      },
    }),
    {
      name: 'inventory-settings',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

export function initTheme() {
  try {
    const raw = localStorage.getItem('inventory-settings');
    if (raw) {
      const { state } = JSON.parse(raw);
      if (state?.theme === 'dark') document.documentElement.classList.add('dark');
    }
  } catch {}
}
