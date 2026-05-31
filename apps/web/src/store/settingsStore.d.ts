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
export declare const useSettingsStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<SettingsState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<SettingsState, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: SettingsState) => void) => () => void;
        onFinishHydration: (fn: (state: SettingsState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<SettingsState, unknown>>;
    };
}>;
export declare function initTheme(): void;
export {};
//# sourceMappingURL=settingsStore.d.ts.map