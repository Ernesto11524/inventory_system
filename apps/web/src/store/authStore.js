import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
export const useAuthStore = create()(persist((set) => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    setUser: (user) => set({ user }),
    setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
    login: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken, isAuthenticated: true }),
    logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
}), {
    name: 'inventory-auth',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
    }),
}));
//# sourceMappingURL=authStore.js.map