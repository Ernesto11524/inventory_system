import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
const defaults = {
    storeName: 'StockFlow',
    storeTagline: 'Inventory System',
    currency: 'GHS',
    currencySymbol: 'GH₵',
};
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    }
    else {
        document.documentElement.classList.remove('dark');
    }
}
export const useSettingsStore = create()(persist((set, get) => ({
    settings: defaults,
    theme: 'light',
    setSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
    setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
    },
    toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(next);
    },
}), {
    name: 'inventory-settings',
    storage: createJSONStorage(() => localStorage),
    onRehydrateStorage: () => (state) => {
        if (state)
            applyTheme(state.theme);
    },
}));
export function initTheme() {
    try {
        const raw = localStorage.getItem('inventory-settings');
        if (raw) {
            const { state } = JSON.parse(raw);
            if (state?.theme === 'dark')
                document.documentElement.classList.add('dark');
        }
    }
    catch { }
}
//# sourceMappingURL=settingsStore.js.map